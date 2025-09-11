#!/bin/bash

# 🔒 BACKUP AUTOMÁTICO DE FACEPAY LOCAL
# Ejecuta diariamente a las 2 AM

BACKUP_DIR="$HOME/facepay-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="facepay_local"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

echo "🔒 Iniciando backup de FacePay..."

# Backup de base de datos
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
pg_dump $DB_NAME | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Verificar que el backup se creó
if [ -f "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" ]; then
    echo "✅ Backup creado: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"
    
    # Obtener tamaño del backup
    SIZE=$(du -h "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" | cut -f1)
    echo "📊 Tamaño: $SIZE"
    
    # Mantener solo últimos 7 días de backups locales
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
    echo "🗑️ Backups antiguos eliminados (>7 días)"
    
    # Contar backups restantes
    COUNT=$(ls -1 $BACKUP_DIR/*.sql.gz 2>/dev/null | wc -l)
    echo "📁 Total backups guardados: $COUNT"
else
    echo "❌ Error: No se pudo crear el backup"
    exit 1
fi

# Opcional: Subir a Google Drive con rclone (descomentar si configurado)
# if command -v rclone &> /dev/null; then
#     echo "☁️ Subiendo a Google Drive..."
#     rclone copy "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" gdrive:facepay-backups/
#     echo "✅ Backup subido a la nube"
# fi

echo "✅ Backup completado exitosamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"