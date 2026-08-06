$schemaPath = "C:\Users\Zethenial\Downloads\water refilling station\backend\prisma\schema.prisma"
$lines = Get-Content $schemaPath

# FIX-01: Add deleted_at after updated_at in all models
$step1 = @()
foreach ($line in $lines) {
    $step1 += $line
    if ($line -match 'updated_at' -and $line -match '@default\(now\)' -and $line -match '@db\.Timestamp') {
        $step1 += "  deleted_at          DateTime?  @db.Timestamp"
    }
}

# FIX-03: Change ContainerMovement.movement_type from String to MovementType
$step2 = $step1 -replace 'movement_type\s+String', 'movement_type          MovementType'

# FIX-02: Add tenant_id to 9 missing models
$modelsNeedingTenantId = @("UserRoleAssignment", "RolePermission", "RefreshToken", "GallonStatusHistory", "GallonInspection", "GallonFillLog", "DeliveryProof", "Installment", "NotificationPreference")

$step3 = @()
$inTargetModel = $false
foreach ($line in $step2) {
    $step3 += $line
    
    foreach ($modelName in $modelsNeedingTenantId) {
        if ($line -eq "model $modelName {") {
            $inTargetModel = $true
            break
        }
    }
    
    if ($inTargetModel -and $line -match '^\s+id\s+String\s+@id\s+@default\(uuid\)') {
        $step3 += "  tenant_id       String"
    }
    
    if ($inTargetModel -and $line -eq '}') {
        $inTargetModel = $false
    }
}

# Add @@index([tenant_id]) before @@map for each of the 9 models
$finalLines = @()
foreach ($line in $step3) {
    foreach ($modelName in $modelsNeedingTenantId) {
        $mapName = $modelName.ToLower()
        if ($line -eq "  @@map(`"$mapName`")") {
            $finalLines += "  @@index([tenant_id])"
            break
        }
    }
    $finalLines += $line
}

Set-Content $schemaPath $finalLines
Write-Host "Schema fixes applied successfully."
