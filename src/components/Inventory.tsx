import React, { useState, useEffect } from "react";

export function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [restockAmounts, setRestockAmounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleRestock = async (id: string) => {
    const amount = restockAmounts[id] || 10;
    try {
      await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, restock_g: amount }),
      });
      fetchInventory();
    } catch (err) {
      console.error("Restock failed:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => (item.id || item.fragrance_id) !== id));
      } else {
        alert("Failed to delete item.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "896px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e5e5", paddingBottom: "16px", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#171717" }}>Inventory</h2>
          <p style={{ fontSize: "12px", color: "#737373", margin: "4px 0 0 0" }}>
            Stock decrements automatically each time you log a batch on the Calculator tab. Restock manually below.
          </p>
        </div>
        <span style={{ fontSize: "12px", fontFamily: "monospace", backgroundColor: "#f5f5f5", color: "#525252", padding: "4px 12px", borderRadius: "4px", border: "1px solid #e5e5e5" }}>
          {items.length} tracked oils
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", fontSize: "14px", color: "#a3a3a3" }}>
          Loading inventory...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", fontSize: "14px", color: "#a3a3a3", border: "1px dashed #e5e5e5", borderRadius: "8px" }}>
          No inventory items found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {items.map((item) => {
            const itemId = item.id || item.fragrance_id;
            return (
              <div
                key={itemId}
                style={{ padding: "16px", backgroundColor: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontWeight: 600, color: "#171717", fontSize: "16px", margin: 0 }}>{item.name}</h3>
                    <span style={{ fontSize: "12px", color: "#737373" }}>{item.tier}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#171717" }}>
                      {Number(item.stock_g).toFixed(2)} g
                    </div>
                    <div style={{ fontSize: "10px", color: "#a3a3a3" }}>
                      threshold {Number(item.low_threshold_g || 10).toFixed(2)}g
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #f5f5f5", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="number"
                      placeholder="Restock amount (g)"
                      value={restockAmounts[itemId] || ""}
                      onChange={(e) =>
                        setRestockAmounts({ ...restockAmounts, [itemId]: Number(e.target.value) })
                      }
                      style={{ padding: "6px 12px", fontSize: "12px", border: "1px solid #d4d4d4", borderRadius: "4px", width: "160px", outline: "none" }}
                    />
                    <button
                      onClick={() => handleRestock(itemId)}
                      style={{ padding: "6px 12px", backgroundColor: "#171717", color: "#ffffff", fontSize: "12px", borderRadius: "4px", border: "none", cursor: "pointer" }}
                    >
                      Add stock
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(itemId, item.name)}
                    disabled={deletingId === itemId}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "#dc2626",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: "4px",
                      fontWeight: 500,
                      cursor: deletingId === itemId ? "not-allowed" : "pointer",
                      opacity: deletingId === itemId ? 0.5 : 1
                    }}
                  >
                    {deletingId === itemId ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Inventory;
