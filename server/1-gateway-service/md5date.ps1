$datetime = Get-Date
$datetimeAsString = $datetime.ToString()
$md5 = [System.Security.Cryptography.MD5]::Create()
$hash = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($datetimeAsString))
$hashString = [BitConverter]::ToString($hash) -replace "-", ""
$hashString
