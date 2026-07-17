/* هيكل تحميل خفيف بدل شاشة تحميل تُغطّي الصفحة — يُبقي البنية ظاهرة */
export function CatalogSkeleton() {
  return (
    <div className="shop-layout" aria-hidden="true">
      <aside className="filters catalog-skeleton-filters">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="sk-line" />
        ))}
      </aside>
      <div className="catalog">
        <div className="product-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sk-card">
              <span className="sk-image" />
              <span className="sk-line sk-short" />
              <span className="sk-line" />
              <span className="sk-line sk-price" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
