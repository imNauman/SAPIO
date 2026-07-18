"START" | Out-File -FilePath c:\Users\Nauman\Desktop\SAPIO\mobile\_started.txt -Encoding utf8
Set-Location c:\Users\Nauman\Desktop\SAPIO\mobile
& "C:\Program Files\nodejs\npm.cmd" exec tsc -- --noEmit -p tsconfig.json > c:\Users\Nauman\Desktop\SAPIO\mobile\_tsc_out.txt 2>&1
$code = $LASTEXITCODE
if ($code -eq 0) {
  "PASS" | Out-File -FilePath c:\Users\Nauman\Desktop\SAPIO\mobile\_result.txt -Encoding utf8
} else {
  "FAIL" | Out-File -FilePath c:\Users\Nauman\Desktop\SAPIO\mobile\_result.txt -Encoding utf8
}
"EXITCODE=$code" | Out-File -FilePath c:\Users\Nauman\Desktop\SAPIO\mobile\_exitcode.txt -Encoding utf8
