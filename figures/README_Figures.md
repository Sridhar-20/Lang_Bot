# Figures and Diagrams for LanguaBot Research Paper

This directory contains all figures and tables for the IEEE research paper.

## Files Included

### Figures (SVG Format)

1. **Figure1_System_Architecture.svg**
   - Shows the complete three-tier system architecture
   - Includes: User Interface Layer, Frontend Layer, Backend Layer, Database Layer, and External Services
   - **Placement**: Section III.A (System Architecture Overview)

2. **Figure2_Hybrid_Recognition_Flow.svg**
   - Illustrates the hybrid speech recognition process
   - Shows Phase 1 (Browser STT) and Phase 2 (Whisper AI) parallel processing
   - **Placement**: Section III.D (Hybrid Speech Recognition System)

3. **Figure3_Component_Interaction.svg**
   - Details the interaction flow between all components
   - Shows numbered sequence of interactions (1-15)
   - **Placement**: Section IV.A (Speech Recognition Implementation)

### Tables

4. **Table1_System_Comparison.md**
   - Comparison table of different speech recognition approaches
   - **Placement**: Section V.A (Experimental Evaluation - Methodology)
   - Already integrated into HTML paper

## How to Use These Figures

### Option 1: Convert SVG to Images (Recommended for Word)

1. **Using Inkscape** (Free):
   ```bash
   inkscape Figure1_System_Architecture.svg --export-filename=Figure1.png --export-dpi=300
   ```

2. **Using Online Converter**:
   - Visit: https://cloudconvert.com/svg-to-png
   - Upload SVG file
   - Set DPI to 300 for high quality
   - Download PNG

3. **Using Browser**:
   - Open SVG in Chrome/Firefox
   - Right-click → Inspect
   - Take screenshot or use browser's print to PDF

### Option 2: Embed SVG Directly (For HTML/PDF)

The SVG files can be embedded directly in HTML:
```html
<img src="figures/Figure1_System_Architecture.svg" alt="System Architecture" style="width: 100%; max-width: 800px;">
```

### Option 3: Use in Microsoft Word

1. Open Word document
2. Insert → Pictures → This Device
3. Select the PNG version (convert SVG first)
4. Right-click image → Format Picture
5. Set wrapping to "In Line with Text" or "Top and Bottom"
6. Add caption: Right-click → Insert Caption → "Figure 1. LanguaBot System Architecture"

### Option 4: Use in LaTeX

```latex
\begin{figure}[h]
    \centering
    \includegraphics[width=0.9\textwidth]{figures/Figure1_System_Architecture.pdf}
    \caption{LanguaBot System Architecture}
    \label{fig:architecture}
\end{figure}
```

## Figure Specifications

- **Format**: SVG (Scalable Vector Graphics)
- **Dimensions**: 800x600px (can be scaled without quality loss)
- **Colors**: Black and white with grayscale fills (print-friendly)
- **Font**: Times New Roman (matches paper style)
- **Resolution**: Vector format - infinite scalability

## Captions (Already Included in SVG)

- **Fig. 1**: LanguaBot System Architecture
- **Fig. 2**: Hybrid Speech Recognition Flow
- **Fig. 3**: Component Interaction Diagram

## Editing Figures

To edit SVG files:
- Use Inkscape (free, open-source)
- Use Adobe Illustrator
- Use any text editor (SVG is XML-based)
- Use online editors like https://boxy-svg.com/

## Notes for IEEE Submission

1. **Figure Placement**: Place figures as close as possible to their first mention
2. **Caption Format**: Use "Fig. X" format (already included)
3. **Resolution**: Ensure 300 DPI minimum for print
4. **File Size**: Keep under 10MB per figure
5. **Format**: IEEE accepts PDF, PNG, JPG, EPS, SVG

## Quick Conversion Script

If you have ImageMagick installed:
```bash
# Convert all SVGs to PNG at 300 DPI
for file in *.svg; do
    convert -density 300 "$file" "${file%.svg}.png"
done
```

## Verification Checklist

- [x] All figures are in SVG format
- [x] Captions are included
- [x] Figures match paper content
- [x] Black and white/grayscale (print-friendly)
- [x] Times New Roman font used
- [x] Proper IEEE figure numbering (Fig. 1, Fig. 2, etc.)
- [x] High resolution (vector format)

## Integration Status

- ✅ Figure references added to HTML paper
- ✅ Table I integrated into HTML paper
- ✅ Captions included in SVG files
- ⚠️ Need to convert to images for Word/PDF submission

