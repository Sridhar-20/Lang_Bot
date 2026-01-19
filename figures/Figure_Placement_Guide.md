# Figure Placement Guide for IEEE Paper

## Where Each Figure Should Appear

### Figure 1: System Architecture
**Location**: Section III.A (Overview)
**Text Reference**: 
> "LanguaBot employs a three-tier architecture consisting of: (1) client-side React application with offline AI capabilities, (2) Express.js backend server for data management and AI integration, and (3) MongoDB database for persistent storage of user sessions and progress. The overall system architecture is illustrated in Fig. 1."

**Placement**: Immediately after the paragraph above, before subsection B.

---

### Figure 2: Hybrid Speech Recognition Flow
**Location**: Section III.D (Hybrid Speech Recognition System)
**Text Reference**:
> "The hybrid speech recognition system operates as follows (see Fig. 2 for detailed flow):"

**Placement**: After the introductory sentence, before the numbered list.

---

### Figure 3: Component Interaction Diagram
**Location**: Section IV.A (Speech Recognition Implementation)
**Text Reference**:
> "The speech recognition system utilizes the browser's MediaRecorder API to capture audio at 16kHz sample rate, compatible with both Web Speech API and Whisper model requirements. Audio chunks are processed in real-time for browser STT and buffered for Whisper processing. The complete interaction flow between components is shown in Fig. 3."

**Placement**: At the end of the first paragraph in Section IV.A.

---

### Table I: System Comparison
**Location**: Section V.A (Methodology)
**Text Reference**:
> "To evaluate the effectiveness of LanguaBot, we conducted a user study with 25 participants learning English as a second language. Participants used the system for four weeks, practicing for at least 15 minutes daily. Pre and post-study assessments measured speaking fluency, grammar accuracy, and confidence levels. A comparison of LanguaBot with existing approaches is presented in Table I."

**Placement**: Immediately after the paragraph above (already integrated in HTML).

---

## IEEE Figure Formatting Rules

1. **Figure Placement**:
   - Place figures as close as possible to their first mention
   - Figures should appear on the same page or the following page
   - Never place figures before they are referenced

2. **Figure Captions**:
   - Format: "Fig. X. [Description]"
   - Place below the figure
   - Use 9pt font
   - Center-aligned

3. **Figure Size**:
   - Should fit within column width (3.5 inches for single column)
   - Can span both columns if needed (7 inches)
   - Maintain aspect ratio

4. **Figure Quality**:
   - Minimum 300 DPI for print
   - Use vector graphics (SVG, EPS) when possible
   - Ensure text is readable at print size

5. **Figure Numbering**:
   - Sequential: Fig. 1, Fig. 2, Fig. 3...
   - Separate from table numbering (Table I, Table II...)

## Example Figure Insertion (Word)

```
[Paragraph mentioning Fig. 1]

[Insert Figure 1 here]

[Continue with next paragraph]
```

## Example Figure Insertion (LaTeX)

```latex
The overall system architecture is illustrated in Fig.~\ref{fig:architecture}.

\begin{figure}[h]
    \centering
    \includegraphics[width=0.9\textwidth]{figures/Figure1_System_Architecture.pdf}
    \caption{LanguaBot System Architecture}
    \label{fig:architecture}
\end{figure}

The frontend is built using React 18...
```

## Current Status

- ✅ All figure references added to paper text
- ✅ Table I integrated into HTML version
- ✅ SVG figures created and ready
- ⚠️ Need to convert SVGs to images for final submission
- ⚠️ Need to insert figures into Word/PDF version

## Next Steps

1. Convert SVG files to high-resolution PNG/PDF
2. Insert figures into Word document at appropriate locations
3. Verify all figure references are correct
4. Ensure figures are readable and properly sized
5. Check that captions match IEEE format

