# LaTeX Editor Implementation Walkthrough

I have implemented a new "Edit" feature that allows users to modify the generated worksheet using either a raw LaTeX code editor or a visual rich-text editor.

## Changes

### 1. UI Updates (`index.html`)
- Added an **Edit** button to the preview toolbar.
- Added an **Editor Modal** containing:
  - Tab navigation (LaTeX Code vs. Visual Editor).
  - **Code Pane**: A textarea for raw LaTeX editing.
  - **Visual Pane**: A contenteditable area with a formatting toolbar (Bold, Italic, Lists, Headings).
  - Action buttons (Cancel, Apply Changes).

### 2. Styling (`styles.css`)
- Added styles for the modal overlay, container, and tabs.
- Styled the code editor and visual editor for a clean, professional look.
- Added animations for modal appearance.

### 3. Logic (`script.js`)
- **`setupEditor()`**: Initializes the editor event listeners.
- **Tab Switching**:
  - **Code -> Visual**: Uses a basic regex-based converter (`convertLaTeXToHTML`) to render the LaTeX as HTML for visual editing.
  - **Visual -> Code**: Uses the AI API (`convertHTMLToLaTeX`) to intelligently convert the HTML edits back into valid LaTeX, preserving the original preamble.
- **Apply Changes**: Updates the application state with the new LaTeX and re-renders the PDF preview.

## How to Test

1.  **Generate a Worksheet**:
    -   Enter a prompt (e.g., "Math worksheet for 1st grade") and click Generate.
    -   Wait for the PDF preview to appear.

2.  **Open Editor**:
    -   Click the **Edit** button in the top-right toolbar.
    -   The modal should open with the "LaTeX Code" tab active, showing the generated code.

3.  **Edit Code**:
    -   Modify the LaTeX code (e.g., change a title or add a question).
    -   Click **Apply Changes**.
    -   Verify that the PDF preview updates with your changes.

4.  **Visual Editing**:
    -   Open the Editor again.
    -   Switch to the **Visual Editor** tab.
    -   You should see a simplified HTML representation of the worksheet.
    -   Use the toolbar to bold text, add lists, or change headings.
    -   Type new text directly into the editor.
    -   Switch back to the **LaTeX Code** tab.
        -   *Note: This triggers an AI conversion, so it may take a few seconds.*
    -   Verify that the LaTeX code now reflects your visual edits.
    -   Click **Apply Changes** to see the updated PDF.

## Notes
-   The **Visual Editor** uses a simplified HTML view. Complex LaTeX structures (like TikZ diagrams or complex math formulas) might not render perfectly in the visual view but are preserved in the code view.
-   Switching from **Visual -> Code** relies on the AI to generate valid LaTeX, ensuring that the document structure remains intact.
