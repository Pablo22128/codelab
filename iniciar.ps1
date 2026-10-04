# Lanzador de CodeLab: servidor local + ventana de aplicacion. Se cierra solo al cerrar la ventana.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$port = 5173
$listener = $null
foreach ($p in 5173..5183) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch {}
}
if (-not $listener) { exit 1 }
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css'; '.json'='application/json'; '.svg'='image/svg+xml'; '.webmanifest'='application/manifest+json'; '.ttf'='font/ttf'; '.png'='image/png'; '.ico'='image/x-icon' }
$rs = [runspacefactory]::CreateRunspace(); $rs.Open()
$ps = [powershell]::Create(); $ps.Runspace = $rs
$null = $ps.AddScript({
  param($listener, $root, $types)
  while ($listener.IsListening) {
    try { $ctx = $listener.GetContext() } catch { break }
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '') { $rel = 'index.html' }
      $f = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($f.StartsWith($root) -and [IO.File]::Exists($f)) {
        $b = [IO.File]::ReadAllBytes($f); $t = $types[[IO.Path]::GetExtension($f)]
        if (-not $t) { $t = 'application/octet-stream' }
        $ctx.Response.ContentType = $t; $ctx.Response.ContentLength64 = $b.Length
        $ctx.Response.OutputStream.Write($b, 0, $b.Length)
      } else { $ctx.Response.StatusCode = 404 }
    } catch {}
    try { $ctx.Response.Close() } catch {}
  }
}).AddArgument($listener).AddArgument($root).AddArgument($types)
$null = $ps.BeginInvoke()

$url = "http://localhost:$port/"
$exe = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
         "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($exe) {
  $prof = Join-Path $env:LOCALAPPDATA 'CodeLab\perfil'
  Start-Process $exe -ArgumentList "--app=$url", "--user-data-dir=`"$prof`"", '--no-first-run', '--disable-features=msEdgeSidebarV2' -Wait
} else {
  Start-Process $url
  Start-Sleep -Seconds 14400   # sin Edge/Chrome: queda activo 4 h
}
$listener.Stop(); $ps.Dispose(); $rs.Dispose()
