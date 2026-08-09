Add-Type -AssemblyName System.Drawing
$root = 'D:\GitHub Project\Paperly\src-tauri\icons'
New-Item -ItemType Directory -Path $root -Force | Out-Null

function New-IconPng($size, $path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(209, 17, 17))
  $fontSize = [Math]::Max(8, [int]($size * 0.52))
  $font = New-Object System.Drawing.Font('Georgia', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString('T', $font, $white, (New-Object System.Drawing.RectangleF(0, 0, $size, $size)), $fmt)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-IconPng 32 "$root\32x32.png"
New-IconPng 64 "$root\64x64.png"
New-IconPng 128 "$root\128x128.png"
New-IconPng 256 "$root\256x256.png"
New-IconPng 512 "$root\icon.png"

$icoPath = "$root\icon.ico"
$pngBytes = [System.IO.File]::ReadAllBytes("$root\256x256.png")
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]1)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([uint16]0)
$bw.Write([uint16]0)
$bw.Write([uint32]$pngBytes.Length)
$bw.Write([uint32]22)
$bw.Write($pngBytes)
$bw.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
Write-Output "icons generated: $root"
