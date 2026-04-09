from pathlib import Path
import re
for path in sorted(Path('.').glob('azure_part*.sql')):
    text = path.read_text('utf-8')
    new_text = re.sub(
        r"IF EXISTS \(SELECT 1 FROM sys\.identity_columns WHERE object_id = OBJECT_ID\(N'(dbo\.[^']+)'\)\) EXEC\('SET IDENTITY_INSERT ([^ ]+) ON'\);",
        r"IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'\1')) SET IDENTITY_INSERT \2 ON;",
        text)
    new_text = re.sub(
        r"IF EXISTS \(SELECT 1 FROM sys\.identity_columns WHERE object_id = OBJECT_ID\(N'(dbo\.[^']+)'\)\) EXEC\('SET IDENTITY_INSERT ([^ ]+) OFF'\);",
        r"IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'\1')) SET IDENTITY_INSERT \2 OFF;",
        new_text)
    if new_text != text:
        path.write_text(new_text, 'utf-8')
        print('patched', path)
