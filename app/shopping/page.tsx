"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  shoppingListService,
  type ShoppingList,
  type ShoppingListItem,
} from "../../src/services/shopping/ShoppingListService";
import {
  shoppingOptimizationService,
  type ShoppingOptimizationResult,
} from "../../src/services/shopping/ShoppingOptimizationService";
import ShoppingOptimizationResultCard from "../../src/components/shopping/ShoppingOptimizationResult";
const units = ["adet", "kg", "gram", "litre", "paket"];

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] =
    useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
const [barcodeLoading, setBarcodeLoading] = useState(false);

const barcodeReader = new BrowserMultiFormatReader();
const videoRef = useRef<HTMLVideoElement>(null);
  const [newListName, setNewListName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("adet");

  const [loading, setLoading] = useState(true);
  const [creatingList, setCreatingList] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [processingItemId, setProcessingItemId] =
    useState<number | null>(null);

  const [optimizationLoading, setOptimizationLoading] =
    useState(false);
    const [optimizationResult, setOptimizationResult] =
  useState<ShoppingOptimizationResult | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLists() {
      setLoading(true);
      setError("");

      try {
        const data = await shoppingListService.getLists();

        if (!active) {
          return;
        }

        setLists(data);

        if (data.length === 0) {
          setSelectedList(null);
          setItems([]);
          return;
        }

        const firstList = data[0];

        const listWithItems =
          await shoppingListService.getListWithItems(firstList.id);

        if (!active) {
          return;
        }

        setSelectedList(firstList);
        setItems(listWithItems.items);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Alışveriş listeleri yüklenemedi.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLists();

    return () => {
      active = false;
    };
  }, []);

  async function handleSelectList(list: ShoppingList) {
    setSelectedList(list);
    setItems([]);
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const listWithItems =
        await shoppingListService.getListWithItems(list.id);

      setItems(listWithItems.items);
    } catch (selectError) {
      setError(
        selectError instanceof Error
          ? selectError.message
          : "Alışveriş listesi açılamadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateList(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanedName = newListName.trim();

    if (!cleanedName) {
      setError("Lütfen liste adı yazın.");
      return;
    }

    setCreatingList(true);
    setError("");
    setMessage("");

    try {
      const createdList =
        await shoppingListService.createList(cleanedName);

      setLists((currentLists) => [
        createdList,
        ...currentLists,
      ]);

      setSelectedList(createdList);
      setItems([]);
      setNewListName("");
      setMessage("Yeni alışveriş listesi oluşturuldu.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Alışveriş listesi oluşturulamadı.",
      );
    } finally {
      setCreatingList(false);
    }
  }

  async function handleAddItem(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedList) {
      setError("Önce bir alışveriş listesi oluşturun.");
      return;
    }

    const cleanedProductName = productName.trim();
    const parsedQuantity = Number(quantity.replace(",", "."));

    if (!cleanedProductName) {
      setError("Lütfen ürün adı yazın.");
      return;
    }

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError("Miktar sıfırdan büyük olmalıdır.");
      return;
    }

    setAddingItem(true);
    setError("");
    setMessage("");

    try {
      const createdItem =
        await shoppingListService.addItem({
          listId: selectedList.id,
          productName: cleanedProductName,
          quantity: parsedQuantity,
          unit,
        });

      setItems((currentItems) => [
        ...currentItems,
        createdItem,
      ]);

      setProductName("");
      setQuantity("1");
      setUnit("adet");
      setMessage(`${createdItem.product_name} listeye eklendi.`);
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Ürün listeye eklenemedi.",
      );
    } finally {
      setAddingItem(false);
    }
  }
async function addProductToSelectedList(
  productNameToAdd: string,
  barcode?: string,
  imageUrl?: string | null,
) {
  if (!selectedList) {
    setError("Önce bir alışveriş listesi oluşturun.");
    return;
  }

  const cleanedProductName = productNameToAdd.trim();

  if (!cleanedProductName) {
    setError("Ürün adı bulunamadı.");
    return;
  }

  setAddingItem(true);
  setError("");
  setMessage("");

  try {
    const createdItem =
      await shoppingListService.addItem({
        listId: selectedList.id,
        productName: cleanedProductName,
        barcode,
        imageUrl,
        quantity: 1,
        unit: "adet",
      });

    setItems((currentItems) => [
      ...currentItems,
      createdItem,
    ]);

    setProductName("");
    setQuantity("1");
    setUnit("adet");

    setMessage(
      `${createdItem.product_name} barkodla listeye eklendi.`,
    );
  } catch (addError) {
    setError(
      addError instanceof Error
        ? addError.message
        : "Ürün listeye eklenemedi.",
    );
  } finally {
    setAddingItem(false);
  }
}
  async function handleToggleItem(item: ShoppingListItem) {
    setProcessingItemId(item.id);
    setError("");
    setMessage("");

    try {
      await shoppingListService.updateItemCompletion(
        item.id,
        !item.is_completed,
      );

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                is_completed: !currentItem.is_completed,
              }
            : currentItem,
        ),
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Ürün durumu güncellenemedi.",
      );
    } finally {
      setProcessingItemId(null);
    }
  }

  async function handleRemoveItem(item: ShoppingListItem) {
    setProcessingItemId(item.id);
    setError("");
    setMessage("");

    try {
      await shoppingListService.removeItem(item.id);

      setItems((currentItems) =>
        currentItems.filter(
          (currentItem) => currentItem.id !== item.id,
        ),
      );

      setMessage(`${item.product_name} listeden silindi.`);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Ürün listeden silinemedi.",
      );
    } finally {
      setProcessingItemId(null);
    }
  }

  async function handleRemoveList() {
    if (!selectedList) {
      return;
    }

    const shouldDelete = window.confirm(
      `"${selectedList.name}" listesini silmek istediğinize emin misiniz?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await shoppingListService.removeList(selectedList.id);

      const remainingLists = lists.filter(
        (list) => list.id !== selectedList.id,
      );

      setLists(remainingLists);
      setSelectedList(null);
      setItems([]);

      if (remainingLists.length > 0) {
        await handleSelectList(remainingLists[0]);
      }

      setMessage("Alışveriş listesi silindi.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Alışveriş listesi silinemedi.",
      );
    }
  }

 async function handleOptimizeBasket() {
  const selectedItems = items.filter(
  (item) => !item.is_completed,
);

  if (selectedItems.length === 0) {
    setError(
      "Optimizasyon için en az bir tamamlanmamış ürün bulunmalıdır.",
    );
    return;
  }

  setOptimizationLoading(true);
  setOptimizationResult(null);
  setError("");
  setMessage("");

  try {
    const result =
      await shoppingOptimizationService.optimizeBasket(
      selectedItems.map((item) => ({
  id: item.id,
  productName: item.product_name,
  barcode: item.barcode ?? undefined,
  quantity: item.quantity,
  unit: item.unit,
})),
      );
console.log(result);
    setOptimizationResult(result);

    setMessage(
      `${result.items.length} ürün başarıyla optimize edildi. Toplam tutar: ${result.total.toFixed(2)} ₺`,
    );
  } catch (err) {
    setOptimizationResult(null);

    setError(
      err instanceof Error
        ? err.message
        : "Market optimizasyonu başarısız oldu.",
    );
  } finally {
    setOptimizationLoading(false);
  }
}
async function handleScanBarcode() {
  let barcodeRead = false;

  try {
    setBarcodeLoading(true);

    const devices =
      await BrowserMultiFormatReader.listVideoInputDevices();

    if (devices.length === 0) {
      alert("Kamera bulunamadı.");
      setBarcodeLoading(false);
      return;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const videoElement = videoRef.current;

    if (!videoElement) {
      alert("Kamera görüntü alanı hazır değil.");
      setBarcodeLoading(false);
      return;
    }

    const selectedDeviceId = devices[0].deviceId;

    await barcodeReader.decodeFromVideoDevice(
      selectedDeviceId,
      videoElement,
      async (result, _error, controls) => {
        if (!result || barcodeRead) {
          return;
        }

        barcodeRead = true;
        controls.stop();
        setBarcodeLoading(false);

const barcode = result.getText().trim();
        try {
          const response = await fetch(
            `/api/barcode?barcode=${encodeURIComponent(barcode)}`,
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            alert(
              data.error ??
                `Barkod okundu ancak ürün bulunamadı: ${barcode}`,
            );
            return;
          }

        setProductName(data.product.product_name);

await addProductToSelectedList(
  data.product.product_name,
  barcode,
  data.product.image_url,
);
        } catch (lookupError) {
          console.error(
            "Barkod ürün sorgulama hatası:",
            lookupError,
          );

          alert("Barkod okundu ancak ürün bilgisi alınamadı.");
        }
      },
    );
  } catch (error) {
    console.error("Kamera hatası:", error);
    alert("Kamera açılamadı.");
    setBarcodeLoading(false);
  }
}

const completedCount = items.filter(
    (item) => item.is_completed,
  ).length;

  const progress =
    items.length === 0
      ? 0
      : Math.round((completedCount / items.length) * 100);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "42px 20px 70px",
        background:
          "radial-gradient(circle at top, #172554 0%, #0f172a 38%, #020617 100%)",
        color: "#f8fafc",
      }}
    >{barcodeLoading && (
  <div
    style={{
      marginBottom: "20px",
      padding: "16px",
      borderRadius: "16px",
      background: "#111827",
      border: "1px solid #334155",
    }}
  >
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: "100%",
        borderRadius: "12px",
      }}
    />
  </div>
)}
      <div
        style={{
          width: "min(1180px, 100%)",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                color: "#4ade80",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "1px",
              }}
            >
              OPPORTUNITYOS
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(34px, 6vw, 56px)",
                letterSpacing: "-2px",
              }}
            >
              Akıllı Sepet
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: "#94a3b8",
                lineHeight: 1.6,
              }}
            >
              Alışveriş listeni oluştur, ürünlerini yönet ve en
              uygun market kombinasyonunu bul.
            </p>
          </div>

          <Link
            href="/dashboard"
            style={{
              padding: "12px 16px",
              border:
                "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "12px",
              color: "#e2e8f0",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            ← Dashboard
          </Link>
        </header>

        {(error || message) && (
          <div
            role="status"
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              border: error
                ? "1px solid rgba(248, 113, 113, 0.35)"
                : "1px solid rgba(34, 197, 94, 0.35)",
              borderRadius: "12px",
              backgroundColor: error
                ? "rgba(127, 29, 29, 0.25)"
                : "rgba(5, 46, 22, 0.45)",
              color: error ? "#fecaca" : "#86efac",
              fontWeight: 700,
            }}
          >
            {error || message}
          </div>
        )}

        <div
          className="shopping-layout"
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(260px, 330px) minmax(0, 1fr)",
            gap: "22px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              padding: "20px",
              border:
                "1px solid rgba(148, 163, 184, 0.16)",
              borderRadius: "20px",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: "20px",
              }}
            >
              Alışveriş listelerim
            </h2>

            <form
              onSubmit={handleCreateList}
              style={{
                display: "grid",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <input
                value={newListName}
                onChange={(event) => {
                  setNewListName(event.target.value);
                  setError("");
                }}
                placeholder="Örnek: Haftalık alışveriş"
                disabled={creatingList}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 13px",
                  border:
                    "1px solid rgba(148, 163, 184, 0.25)",
                  borderRadius: "11px",
                  outline: "none",
                  backgroundColor:
                    "rgba(2, 6, 23, 0.65)",
                  color: "#ffffff",
                  fontSize: "14px",
                }}
              />

              <button
                type="submit"
                disabled={creatingList}
                style={{
                  padding: "12px",
                  border: "none",
                  borderRadius: "11px",
                  background: creatingList
                    ? "#475569"
                    : "linear-gradient(135deg, #22c55e, #14b8a6)",
                  color: creatingList
                    ? "#cbd5e1"
                    : "#052e16",
                  fontWeight: 900,
                  cursor: creatingList
                    ? "wait"
                    : "pointer",
                }}
              >
                {creatingList
                  ? "Oluşturuluyor..."
                  : "＋ Yeni Liste"}
              </button>
            </form>

            {lists.length === 0 ? (
              <div
                style={{
                  padding: "22px 14px",
                  border:
                    "1px dashed rgba(148, 163, 184, 0.25)",
                  borderRadius: "14px",
                  color: "#94a3b8",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                Henüz alışveriş listen yok.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "9px",
                }}
              >
                {lists.map((list) => {
                  const isSelected =
                    selectedList?.id === list.id;

                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() =>
                        void handleSelectList(list)
                      }
                      style={{
                        padding: "13px 14px",
                        border: isSelected
                          ? "1px solid rgba(34, 197, 94, 0.5)"
                          : "1px solid rgba(148, 163, 184, 0.14)",
                        borderRadius: "12px",
                        backgroundColor: isSelected
                          ? "rgba(5, 46, 22, 0.75)"
                          : "rgba(2, 6, 23, 0.48)",
                        color: isSelected
                          ? "#86efac"
                          : "#e2e8f0",
                        textAlign: "left",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      🛒 {list.name}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section
            style={{
              minHeight: "520px",
              padding: "24px",
              border:
                "1px solid rgba(148, 163, 184, 0.16)",
              borderRadius: "22px",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              boxShadow:
                "0 18px 55px rgba(0, 0, 0, 0.2)",
            }}
          >
            {!selectedList ? (
              <div
                style={{
                  minHeight: "470px",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "54px" }}>🛒</div>

                  <h2
                    style={{
                      margin: "15px 0 8px",
                      fontSize: "26px",
                    }}
                  >
                    İlk alışveriş listeni oluştur
                  </h2>

                  <p
                    style={{
                      maxWidth: "480px",
                      margin: 0,
                      color: "#94a3b8",
                      lineHeight: 1.7,
                    }}
                  >
                    Sol taraftaki alana liste adını yaz ve
                    ürünlerini eklemeye başla.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "18px",
                    marginBottom: "22px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "28px",
                      }}
                    >
                      {selectedList.name}
                    </h2>

                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "#94a3b8",
                      }}
                    >
                      {completedCount} / {items.length} ürün
                      tamamlandı
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleRemoveList()
                    }
                    style={{
                      padding: "10px 13px",
                      border:
                        "1px solid rgba(248, 113, 113, 0.35)",
                      borderRadius: "10px",
                      backgroundColor:
                        "rgba(127, 29, 29, 0.22)",
                      color: "#fecaca",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Listeyi Sil
                  </button>
                </div>

                <div
                  style={{
                    height: "10px",
                    marginBottom: "24px",
                    overflow: "hidden",
                    borderRadius: "999px",
                    backgroundColor:
                      "rgba(148, 163, 184, 0.17)",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background:
                        "linear-gradient(90deg, #22c55e, #14b8a6)",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>

                <form
                  className="item-form"
                  onSubmit={handleAddItem}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(180px, 1fr) 100px 120px auto",
                    gap: "10px",
                    marginBottom: "24px",
                  }}
                >
                  <input
                    value={productName}
                    onChange={(event) => {
                      setProductName(event.target.value);
                      setError("");
                    }}
                    placeholder="Ürün adı: Süt, peynir..."
                    disabled={addingItem}
                    style={{
                      minWidth: 0,
                      padding: "12px 13px",
                      border:
                        "1px solid rgba(148, 163, 184, 0.25)",
                      borderRadius: "11px",
                      outline: "none",
                      backgroundColor:
                        "rgba(2, 6, 23, 0.65)",
                      color: "#ffffff",
                    }}
                  />

                  <input
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="Miktar"
                    disabled={addingItem}
                    style={{
                      minWidth: 0,
                      padding: "12px",
                      border:
                        "1px solid rgba(148, 163, 184, 0.25)",
                      borderRadius: "11px",
                      outline: "none",
                      backgroundColor:
                        "rgba(2, 6, 23, 0.65)",
                      color: "#ffffff",
                    }}
                  />

                  <select
                    value={unit}
                    onChange={(event) =>
                      setUnit(event.target.value)
                    }
                    disabled={addingItem}
                    style={{
                      padding: "12px",
                      border:
                        "1px solid rgba(148, 163, 184, 0.25)",
                      borderRadius: "11px",
                      outline: "none",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                    }}
                  >
                    {units.map((currentUnit) => (
                      <option
                        key={currentUnit}
                        value={currentUnit}
                      >
                        {currentUnit}
                      </option>
                    ))}
                  </select>
<button
  type="button"
onClick={handleScanBarcode}
  style={{
    padding: "12px 16px",
    border: "1px solid rgba(59,130,246,.35)",
    borderRadius: "11px",
    background: "rgba(37,99,235,.15)",
    color: "#bfdbfe",
    fontWeight: 700,
    cursor: "pointer",
    marginRight: "10px",
  }}
>
  📷 Barkod Oku
</button>
                  <button
                    type="submit"
                    disabled={addingItem}
                    style={{
                      padding: "12px 16px",
                      border: "none",
                      borderRadius: "11px",
                      background: addingItem
                        ? "#475569"
                        : "linear-gradient(135deg, #22c55e, #14b8a6)",
                      color: addingItem
                        ? "#cbd5e1"
                        : "#052e16",
                      fontWeight: 900,
                      cursor: addingItem
                        ? "wait"
                        : "pointer",
                    }}
                  >
                    {addingItem
                      ? "Ekleniyor..."
                      : "Ürün Ekle"}
                  </button>
                </form>

                {loading ? (
                  <div
                    style={{
                      padding: "50px",
                      color: "#94a3b8",
                      textAlign: "center",
                    }}
                  >
                    Liste yükleniyor...
                  </div>
                ) : items.length === 0 ? (
                  <div
                    style={{
                      padding: "48px 20px",
                      border:
                        "1px dashed rgba(148, 163, 184, 0.25)",
                      borderRadius: "16px",
                      color: "#94a3b8",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "42px" }}>📦</div>

                    <h3
                      style={{
                        margin: "14px 0 7px",
                        color: "#e2e8f0",
                      }}
                    >
                      Liste henüz boş
                    </h3>

                    <p style={{ margin: 0 }}>
                      Yukarıdaki formu kullanarak ilk ürünü ekle.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    {items.map((item) => {
                      const isProcessing =
                        processingItemId === item.id;

                      return (
                        <article
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                              "space-between",
                            flexWrap: "wrap",
                            gap: "14px",
                            padding: "15px",
                            border: item.is_completed
                              ? "1px solid rgba(34, 197, 94, 0.3)"
                              : "1px solid rgba(148, 163, 184, 0.14)",
                            borderRadius: "14px",
                            backgroundColor:
                              item.is_completed
                                ? "rgba(5, 46, 22, 0.48)"
                                : "rgba(2, 6, 23, 0.48)",
                            opacity: isProcessing
                              ? 0.65
                              : 1,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              void handleToggleItem(item)
                            }
                            disabled={isProcessing}
                            style={{
                              display: "flex",
                              flex: "1 1 250px",
                              alignItems: "center",
                              gap: "13px",
                              padding: 0,
                              border: "none",
                              background: "transparent",
                              color: "#ffffff",
                              textAlign: "left",
                              cursor: isProcessing
                                ? "wait"
                                : "pointer",
                            }}
                          >
                            <span
                              style={{
                                width: "26px",
                                height: "26px",
                                display: "grid",
                                flexShrink: 0,
                                placeItems: "center",
                                border: item.is_completed
                                  ? "1px solid #22c55e"
                                  : "1px solid rgba(148, 163, 184, 0.45)",
                                borderRadius: "8px",
                                backgroundColor:
                                  item.is_completed
                                    ? "#22c55e"
                                    : "transparent",
                                color: "#052e16",
                                fontWeight: 900,
                              }}
                            >
                              {item.is_completed ? "✓" : ""}
                            </span>

                            <span>
                              <strong
                                style={{
                                  display: "block",
                                  textDecoration:
                                    item.is_completed
                                      ? "line-through"
                                      : "none",
                                  color: item.is_completed
                                    ? "#86efac"
                                    : "#f8fafc",
                                  fontSize: "16px",
                                }}
                              >
                                {item.image_url && (
  <img
    src={item.image_url}
    alt={item.product_name}
    style={{
      width: "60px",
      height: "60px",
      objectFit: "contain",
      borderRadius: "8px",
      marginBottom: "8px",
      background: "#fff",
      padding: "4px",
    }}
  />
)}
                                {item.product_name}
                              </strong>

                              <span
                                style={{
                                  display: "block",
                                  marginTop: "4px",
                                  color: "#94a3b8",
                                  fontSize: "13px",
                                }}
                              >
                                {item.quantity.toLocaleString(
                                  "tr-TR",
                                )}{" "}
                                {item.unit}
                              </span>
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleRemoveItem(item)
                            }
                            disabled={isProcessing}
                            style={{
                              padding: "9px 12px",
                              border:
                                "1px solid rgba(248, 113, 113, 0.35)",
                              borderRadius: "9px",
                              backgroundColor:
                                "rgba(127, 29, 29, 0.22)",
                              color: "#fecaca",
                              fontWeight: 800,
                              cursor: isProcessing
                                ? "wait"
                                : "pointer",
                            }}
                          >
                            Sil
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
<ShoppingOptimizationResultCard
  result={optimizationResult}
/>
                {items.length > 0 && (
                  <div
                    style={{
                      marginTop: "24px",
                      padding: "18px",
                      border:
                        "1px solid rgba(96, 165, 250, 0.3)",
                      borderRadius: "15px",
                      backgroundColor:
                        "rgba(30, 64, 175, 0.16)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            display: "block",
                            color: "#bfdbfe",
                            fontSize: "17px",
                          }}
                        >
                          Market optimizasyonu
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "5px",
                            color: "#93c5fd",
                            fontSize: "14px",
                          }}
                        >
                          Listedeki ürünler için en ucuz market
                          kombinasyonunu hesaplayacağız.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleOptimizeBasket()
                        }
                        disabled={optimizationLoading}
                        style={{
                          padding: "12px 16px",
                          border: "none",
                          borderRadius: "11px",
                          backgroundColor:
                            optimizationLoading
                              ? "#475569"
                              : "#2563eb",
                          color: "#ffffff",
                          fontWeight: 800,
                          cursor: optimizationLoading
                            ? "wait"
                            : "pointer",
                        }}
                      >
                        {optimizationLoading
                          ? "Hesaplanıyor..."
                          : "En Ucuz Kombinasyonu Hesapla"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 820px) {
          .shopping-layout {
            grid-template-columns: 1fr !important;
          }

          .item-form {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}