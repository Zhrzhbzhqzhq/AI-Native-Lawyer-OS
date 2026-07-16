# LawDesk V1 User Guide

## Who This Guide Is For

This guide is for lawyers using LawDesk V1 to organize Matter-centered legal work. AI assists with analysis and Draft generation; the lawyer makes every formal legal decision.

## First Matter Workflow

```text
Upload
  ↓
Intake
  ↓
Matter
  ↓
Evidence
  ↓
Facts
  ↓
Issues
  ↓
Laws
  ↓
Arguments
  ↓
Documents
  ↓
DOCX
```

## 1. Upload

Open Intake and add the files received for the Matter, such as written materials, PDF documents, images, audio, or text records.

- Confirm that each file appears as successfully uploaded.
- Remove or retry any file showing an upload error.
- The analysis action remains unavailable until at least one valid file has been saved.

## 2. Intake

Start AI analysis after the files have been uploaded.

- Review the proposed Matter information and material summary.
- If analysis fails or the response is unavailable, retry instead of treating the screen as a legal result.
- Intake prepares the Matter and Draft inputs; it does not confirm formal legal conclusions.

## 3. Matter

Open the created Matter Workspace.

- Confirm the Matter title, type, status, and current focus.
- Use the Matter navigation to move through Evidence, Facts, Issues, Laws, Arguments, and Documents.
- If Matter information cannot be loaded, do not rely on default or blank values as case facts.

## 4. Evidence

Review materials and Evidence Drafts.

- Check whether each proposed Evidence item corresponds to the correct source material.
- Accept valid Evidence or ignore unsuitable suggestions.
- Review the Evidence Workspace for available proof goals, analysis, and source relationships.
- Empty analysis means no confirmed result is available; it is not a negative legal conclusion.

## 5. Facts

Generate Fact Drafts from confirmed Evidence.

- Review the title, description, and source Evidence for every Draft.
- Edit inaccurate text, then accept it again before publication.
- Ignore Drafts that should not become formal Facts.
- Only accepted Drafts can be published.

## 6. Issues

Generate Issue Drafts from formal Facts.

- Confirm that each Issue identifies a genuine dispute relevant to the Matter.
- Verify its source Facts.
- Edited Drafts require renewed acceptance.
- Publish only accepted Issues.

## 7. Laws

Generate Law Drafts for the confirmed Issues.

- Verify the title, citation, rule, and source Issues.
- Reject placeholders or unverified citations.
- AI reasoning remains Draft information and must not become formal legal content.
- Publish only after lawyer acceptance.

## 8. Arguments

Generate Argument Drafts from formal Facts, Issues, and Laws.

- Review the position, reasoning, conclusion, and all source relationships.
- Confirm that the argument does not contain Prompt text, internal IDs, or AI metadata.
- Edited Drafts must be accepted again.
- Publish only accepted Arguments.

## 9. Documents

Generate a Document Draft from formal legal objects.

- Review the entire document and complete all lawyer placeholders.
- Edit or regenerate while the Document remains a Draft.
- Mark it ready to publish only after legal and factual review.
- Only a ready_to_publish DocumentDraft can become a formal Document.

## 10. DOCX

After publication, open the formal Document and use DOCX export.

- Export is available only for a formal Document with an exportable status.
- A Draft or review-stage Document cannot be exported as a final document.
- Review the exported DOCX before filing, service, signature, or external use.

## Lawyer Confirmation Rules

- AI suggestions are not lawyer decisions.
- Edited content requires renewed confirmation.
- Ignored Drafts do not create formal objects.
- Published objects are read-only in the V1 Workspace.
- The lawyer remains responsible for legal citations, facts, claims, calculations, court selection, and final document use.

## When Data Is Unavailable

- An empty state means the Backend returned valid but empty data.
- A loading error or unavailable-data message means the result is not known.
- Retry the request and verify the source material before making a legal decision.
- Never treat a network error, blank AI response, or unavailable Workspace as a confirmed case conclusion.
