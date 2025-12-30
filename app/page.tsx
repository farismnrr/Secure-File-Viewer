import Link from "next/link";
import { listDocuments } from "@/lib/registry";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const documents = listDocuments();

  return (
    <div className="home-container">
      <h1>🔒 Secure PDF Viewer</h1>
      <p>DRM-like document viewer with watermarking</p>

      {documents.length > 0 ? (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.docId}>
              <Link href={`/v/${doc.docId}`}>
                📄 {doc.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <p>No documents available.</p>
          <p style={{ fontSize: "0.875rem", marginTop: "1rem" }}>
            Add documents using:<br />
            <code style={{ background: "#1e293b", padding: "0.5rem", borderRadius: "4px", display: "inline-block", marginTop: "0.5rem" }}>
              npx ts-node scripts/encrypt-pdf.ts &lt;file.pdf&gt; &lt;docId&gt;
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
