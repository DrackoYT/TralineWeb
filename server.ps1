param([int]$Port = 8080)

$root = Split-Path -Parent $PSCommandPath
$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.ttf'  = 'font/ttf'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.glb'  = 'model/gltf-binary'
    '.xml'  = 'application/xml; charset=utf-8'
    '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Traline server: http://localhost:$Port/"
Write-Host "Presiona Ctrl+C para detener."

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $reqPath = $ctx.Request.Url.AbsolutePath
    if ($reqPath -eq '/') { $reqPath = '/index.html' }
    $filePath = Join-Path $root $reqPath.TrimStart('/')
    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $t = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $ctx.Response.ContentType = $t
        $data = [System.IO.File]::ReadAllBytes($filePath)
        $ctx.Response.OutputStream.Write($data, 0, $data.Length)
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
}
