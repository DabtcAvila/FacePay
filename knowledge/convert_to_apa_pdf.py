#!/usr/bin/env python3
"""
Conversor de Markdown a PDF con formato APA 7ma edición
Autor: David Fernando Avila Díaz
"""

import markdown2
from weasyprint import HTML, CSS
from datetime import datetime
import re
import sys
import os

def process_markdown_for_apa(markdown_content):
    """
    Procesa el contenido markdown y lo prepara para formato APA
    """
    # Ajustar el título principal y agregar encabezado de página
    lines = markdown_content.split('\n')
    processed_lines = []
    
    # Detectar información del estudiante
    title = ""
    author = ""
    student_id = ""
    course = ""
    date = ""
    
    for i, line in enumerate(lines):
        if line.startswith("# "):
            title = line.replace("# ", "").strip()
        elif "**Estudiante:**" in line:
            author = line.split("**Estudiante:**")[1].strip()
        elif "**Clave Única:**" in line:
            student_id = line.split("**Clave Única:**")[1].strip()
        elif "**Materia:**" in line:
            course = line.split("**Materia:**")[1].strip()
        elif "**Fecha:**" in line:
            date = line.split("**Fecha:**")[1].strip()
    
    # Reconstruir con formato APA
    apa_content = f"""
<div class="title-page">
    <div class="running-head">LA GRAMÁTICA DE PYTHON</div>
    <div class="main-title">{title}</div>
    <div class="author-info">
        <p class="author">{author}</p>
        <p class="student-id">Clave Única: {student_id}</p>
        <p class="institution">Universidad Nacional Autónoma de México</p>
        <p class="course">{course}</p>
        <p class="date">{date}</p>
    </div>
</div>

<div class="page-break"></div>

<div class="abstract">
    <h2>Resumen</h2>
    <p>Este trabajo de investigación analiza la gramática del lenguaje de programación Python para determinar su clasificación dentro de la jerarquía de Chomsky. Se examina específicamente si Python es un lenguaje libre de contexto o sensible al contexto, con enfoque particular en el rol de la indentación significativa. A través del análisis teórico y práctico, se demuestra que Python requiere una gramática sensible al contexto (Tipo 1 en la jerarquía de Chomsky) debido a su sistema de indentación, lo cual tiene implicaciones importantes para el diseño de compiladores y la complejidad computacional del análisis sintáctico.</p>
    <p><strong>Palabras clave:</strong> Python, gramática sensible al contexto, jerarquía de Chomsky, indentación, análisis sintáctico</p>
</div>

<div class="page-break"></div>
"""
    
    # Procesar el resto del contenido
    skip_header = True
    for line in lines:
        if skip_header:
            if line.startswith("## 🎯 Objetivo"):
                skip_header = False
            else:
                continue
        
        # Convertir emojis a texto
        line = line.replace("🎯", "")
        line = line.replace("📚", "")
        line = line.replace("🐍", "")
        line = line.replace("🔍", "")
        line = line.replace("📊", "")
        line = line.replace("🛠️", "")
        line = line.replace("🔬", "")
        line = line.replace("🔄", "")
        line = line.replace("📝", "")
        line = line.replace("🔗", "")
        line = line.replace("💭", "")
        line = line.replace("✅", "[Sí]")
        line = line.replace("❌", "[No]")
        
        # Ajustar encabezados para APA
        if line.startswith("## "):
            line = "# " + line[3:]  # Nivel 1 en APA
        elif line.startswith("### "):
            line = "## " + line[4:]  # Nivel 2 en APA
        elif line.startswith("#### "):
            line = "### " + line[5:]  # Nivel 3 en APA
        
        processed_lines.append(line)
    
    return apa_content + "\n".join(processed_lines)

def create_apa_css():
    """
    Crea el CSS para formato APA 7ma edición
    """
    return """
    @page {
        size: letter;
        margin: 1in;
        @top-right {
            content: counter(page);
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
        }
        @top-left {
            content: "LA GRAMÁTICA DE PYTHON";
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
        }
    }
    
    body {
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 2;
        text-align: left;
        color: #000000;
    }
    
    .title-page {
        page-break-after: always;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 100vh;
        text-align: center;
    }
    
    .running-head {
        position: absolute;
        top: 0;
        left: 0;
        font-size: 12pt;
        text-transform: uppercase;
    }
    
    .main-title {
        font-size: 16pt;
        font-weight: bold;
        margin: 2em 0;
        text-align: center;
    }
    
    .author-info {
        margin-top: 3em;
        text-align: center;
    }
    
    .author-info p {
        margin: 0.5em 0;
    }
    
    .author {
        font-weight: bold;
    }
    
    .abstract {
        page-break-after: always;
    }
    
    .abstract h2 {
        text-align: center;
        font-weight: bold;
        margin: 1em 0;
    }
    
    .page-break {
        page-break-after: always;
    }
    
    h1 {
        font-size: 14pt;
        font-weight: bold;
        text-align: center;
        margin: 1em 0;
    }
    
    h2 {
        font-size: 13pt;
        font-weight: bold;
        text-align: left;
        margin: 1em 0;
    }
    
    h3 {
        font-size: 12pt;
        font-weight: bold;
        font-style: italic;
        text-align: left;
        margin: 1em 0;
        text-indent: 0.5in;
    }
    
    p {
        text-indent: 0.5in;
        margin: 0;
        text-align: justify;
    }
    
    p:first-of-type {
        text-indent: 0;
    }
    
    ul, ol {
        margin-left: 0.5in;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }
    
    li {
        margin: 0.25em 0;
    }
    
    blockquote {
        margin: 1em 0.5in;
        font-size: 11pt;
        line-height: 1.5;
    }
    
    code {
        font-family: 'Courier New', monospace;
        font-size: 10pt;
        background-color: #f5f5f5;
        padding: 0.1em 0.3em;
    }
    
    pre {
        font-family: 'Courier New', monospace;
        font-size: 10pt;
        background-color: #f5f5f5;
        padding: 1em;
        margin: 1em 0.5in;
        line-height: 1.5;
        overflow-x: auto;
        border: 1px solid #ddd;
    }
    
    pre code {
        background-color: transparent;
        padding: 0;
    }
    
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
        font-size: 11pt;
    }
    
    table caption {
        font-style: italic;
        margin-bottom: 0.5em;
        text-align: left;
    }
    
    th {
        border-top: 2px solid black;
        border-bottom: 1px solid black;
        padding: 0.5em;
        text-align: center;
        font-weight: bold;
    }
    
    td {
        padding: 0.5em;
        text-align: left;
    }
    
    tr:last-child td {
        border-bottom: 2px solid black;
    }
    
    strong {
        font-weight: bold;
    }
    
    em {
        font-style: italic;
    }
    
    hr {
        border: none;
        border-top: 1px solid #000;
        margin: 1em 0;
    }
    
    /* Referencias APA */
    .references {
        margin-top: 2em;
    }
    
    .references h1 {
        text-align: center;
    }
    
    .reference-entry {
        margin-left: 0.5in;
        text-indent: -0.5in;
        margin-bottom: 1em;
    }
    """

def convert_to_pdf(input_file, output_file):
    """
    Convierte el archivo markdown a PDF con formato APA
    """
    # Leer el archivo markdown
    with open(input_file, 'r', encoding='utf-8') as f:
        markdown_content = f.read()
    
    # Procesar para formato APA
    apa_markdown = process_markdown_for_apa(markdown_content)
    
    # Convertir markdown a HTML
    html_content = markdown2.markdown(
        apa_markdown,
        extras=[
            'tables',
            'fenced-code-blocks',
            'code-friendly',
            'header-ids',
            'strike',
            'footnotes'
        ]
    )
    
    # Envolver en estructura HTML completa
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>La Gramática de Python y las Gramáticas Sensibles al Contexto</title>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    
    # Crear CSS para APA
    css = CSS(string=create_apa_css())
    
    # Generar PDF
    HTML(string=full_html).write_pdf(output_file, stylesheets=[css])
    
    print(f"✅ PDF generado exitosamente: {output_file}")
    print(f"📄 Formato: APA 7ma edición")
    print(f"📏 Tamaño: Carta (Letter)")
    print(f"🔤 Fuente: Times New Roman 12pt")
    print(f"📐 Márgenes: 1 pulgada")
    print(f"📖 Interlineado: Doble espacio")

if __name__ == "__main__":
    input_file = "/Users/davicho/MASTER proyectos/Orchestrator/knowledge/python"
    output_file = "/Users/davicho/MASTER proyectos/Orchestrator/knowledge/python_apa.pdf"
    
    if not os.path.exists(input_file):
        print(f"❌ Error: No se encuentra el archivo {input_file}")
        sys.exit(1)
    
    try:
        convert_to_pdf(input_file, output_file)
    except Exception as e:
        print(f"❌ Error durante la conversión: {e}")
        sys.exit(1)