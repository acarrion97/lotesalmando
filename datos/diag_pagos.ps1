$u = (Select-String -Path .env -Pattern '^VITE_SUPABASE_URL=(.*)$').Matches[0].Groups[1].Value.Trim()
$s = (Select-String -Path .env -Pattern '^SUPABASE_SERVICE_ROLE_KEY=(.*)$').Matches[0].Groups[1].Value.Trim()
$H = @{ Authorization = "Bearer $s"; apikey = $s; 'User-Agent' = 'node-fetch/1.0' }

# Replica idsFrom(): pagina con orden estable (limit/offset en vez de header Range).
function Get-Ids([string]$table, [string]$col, [string]$filterCol, [int[]]$vals) {
  $out = @()
  if (-not $vals -or $vals.Length -eq 0) { return $out }
  $in = ($vals -join ',')
  $offset = 0
  while ($true) {
    $uri = "$u/rest/v1/$table`?select=$col&$filterCol=in.($in)&order=$col.asc&limit=1000&offset=$offset"
    try { $r = Invoke-WebRequest -Uri $uri -Headers $H -UseBasicParsing } catch { Write-Host "ERROR $table : $_"; break }
    $rows = @($r.Content | ConvertFrom-Json)
    foreach ($row in $rows) { $out += [int]$row.$col }
    if ($rows.Length -lt 1000) { break }
    $offset += 1000
  }
  return $out
}

$empresa = 14
$proy = (Invoke-WebRequest -Uri "$u/rest/v1/proyectos?select=id_proyecto&id_empresa=eq.$empresa" -Headers $H -UseBasicParsing).Content | ConvertFrom-Json
$proyIds = @($proy | ForEach-Object { [int]$_.id_proyecto })
$etapIds = Get-Ids 'etapas' 'id_etapa' 'id_proyecto' $proyIds
$manzIds = Get-Ids 'manzana_bloque' 'id_manzana' 'id_etapa' $etapIds
$loteIds = Get-Ids 'lotes' 'id_lote' 'id_manzana' $manzIds
$ventIds = Get-Ids 'ventas' 'id_venta' 'id_lote' $loteIds
$contIds = Get-Ids 'contratos' 'id_contrato' 'id_venta' $ventIds
$cobrIds = Get-Ids 'cobranzas' 'id_cobranza' 'id_contrato' $contIds

Write-Host "empresa=$empresa proyectos=$($proyIds.Length) etapas=$($etapIds.Length) manzanas=$($manzIds.Length) lotes=$($loteIds.Length) ventas=$($ventIds.Length) contratos=$($contIds.Length) cobranzas=$($cobrIds.Length)"
Write-Host "cobranza 3563 en lista: $($cobrIds -contains 3563)"
Write-Host "cobranza 3564 en lista: $($cobrIds -contains 3564)"

# Pagos: bloques de 500 ids + paginacion (igual que leerPorIds).
$pagos = @()
for ($i = 0; $i -lt $cobrIds.Length; $i += 500) {
  $last = [Math]::Min($i + 499, $cobrIds.Length - 1)
  $in = ($cobrIds[$i..$last] -join ',')
  $offset = 0
  while ($true) {
    $uri = "$u/rest/v1/pagos?select=id_pago&id_cobranza=in.($in)&order=id_pago.desc&limit=1000&offset=$offset"
    try { $r = Invoke-WebRequest -Uri $uri -Headers $H -UseBasicParsing } catch { Write-Host "ERROR pagos: $_"; break }
    $rows = @($r.Content | ConvertFrom-Json)
    foreach ($row in $rows) { $pagos += [int]$row.id_pago }
    if ($rows.Length -lt 1000) { break }
    $offset += 1000
  }
}
$pagos = @($pagos | Sort-Object -Descending)
Write-Host "pagos devueltos por la cadena: $($pagos.Length)"
if ($pagos.Length -gt 0) { Write-Host "max id_pago devuelto: $($pagos[0])" }

$todos = @((Invoke-WebRequest -Uri "$u/rest/v1/pagos?select=id_pago&id_pago=gt.714&limit=1000" -Headers $H -UseBasicParsing).Content | ConvertFrom-Json | ForEach-Object { [int]$_.id_pago })
$faltan = @($todos | Where-Object { $pagos -notcontains $_ })
Write-Host "ids > 714 en BD: $($todos.Length)"
Write-Host "ids > 714 que la app NO veria: $($faltan.Length) -> $(($faltan | Sort-Object) -join ', ')"
