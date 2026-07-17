export default function ProductLoading() {
  return (
    <div className="product-page page-shell" aria-hidden="true">
      <div className="shell">
        <div className="product-detail-hero">
          <div className="gallery-main" style={{ minHeight: "360px" }}>
            <span className="sk-image" style={{ height: "100%", borderRadius: 0 }} />
          </div>
          <div className="product-buy">
            <div className="product-brand">
              <span className="sk-line sk-short" style={{ display: "inline-block", width: "100px", margin: 0 }} />
              <i />
            </div>
            <span className="sk-line" style={{ height: "42px", marginBlock: "18px 8px" }} />
            <span className="sk-line sk-short" style={{ height: "24px", marginBlock: "4px 20px" }} />
            <span className="sk-line" style={{ height: "80px", marginBlock: "24px" }} />
            
            <div className="availability">
              <span className="sk-line sk-short" style={{ margin: 0 }} />
            </div>
            
            <div className="size-picker">
              <span className="sk-line sk-short" style={{ height: "16px", marginBottom: "12px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                <span className="sk-image" style={{ aspectRatio: "1", height: "72px" }} />
                <span className="sk-image" style={{ aspectRatio: "1", height: "72px" }} />
                <span className="sk-image" style={{ aspectRatio: "1", height: "72px" }} />
              </div>
            </div>
            
            <span className="sk-line" style={{ height: "54px", marginTop: "24px", borderRadius: "8px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
