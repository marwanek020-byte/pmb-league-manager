Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\branding\pmb-app-logo.jpg"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($src, $width, $height, $destPath) {
    $destBmp = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $graphics.DrawImage($src, $destRect)
    $graphics.Dispose()
    
    $dir = [System.IO.Path]::GetDirectoryName($destPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated: $destPath ($width x $height)"
}

$resDir = Join-Path $PSScriptRoot "..\android\app\src\main\res"

$sizes = @(
    @{ Folder = "mipmap-mdpi";    AppSize = 48;  FgSize = 108 },
    @{ Folder = "mipmap-hdpi";    AppSize = 72;  FgSize = 162 },
    @{ Folder = "mipmap-xhdpi";   AppSize = 96;  FgSize = 216 },
    @{ Folder = "mipmap-xxhdpi";  AppSize = 144; FgSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; AppSize = 192; FgSize = 432 }
)

foreach ($s in $sizes) {
    $folderPath = Join-Path $resDir $s.Folder
    
    # 1. ic_launcher.png
    Resize-Image $srcImg $s.AppSize $s.AppSize (Join-Path $folderPath "ic_launcher.png")
    
    # 2. ic_launcher_round.png
    Resize-Image $srcImg $s.AppSize $s.AppSize (Join-Path $folderPath "ic_launcher_round.png")
    
    # 3. ic_launcher_foreground.png
    Resize-Image $srcImg $s.FgSize $s.FgSize (Join-Path $folderPath "ic_launcher_foreground.png")
}

$srcImg.Dispose()
Write-Host "All Android icons generated successfully!"
