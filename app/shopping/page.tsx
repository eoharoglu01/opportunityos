"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

import ShoppingOptimizationResultCard from "../../src/components/shopping/ShoppingOptimizationResult";
import {
  shoppingListService,
  type ShoppingList,
  type ShoppingListItem,
} from "../../src/services/shopping/ShoppingListService";
import {
  shoppingOptimizationService,
  type ShoppingOptimizationResult,
} from "../../src/services/shopping/ShoppingOptimizationService";

const units = ["adet", "kg", "gram", "litre", "paket"];
const selectedListStorageKey =
  "opportunityos:selected-shopping-list-id";

type ScannerControls = {
  stop: () => void;
};

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] =
    useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);

  const [newListName, setNewListName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("adet");

  const [loading, setLoading] = useState(true);
  const [creatingList, setCreatingList] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [processingItemId, setProcessingItemId] =
    useState<number | null>(null);

  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [optimizationLoading, setOptimizationLoading] =
    useState(false);
  const [optimizationResult, setOptimizationResult] =
    useState<ShoppingOptimizationResult | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<ScannerControls | null>(null);
  const listRequestIdRef = useRef(0);

  const [barcodeReader] = useState(
    () => new BrowserMultiFormatReader(),
  );

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function clearOptimizationResult() {
    setOptimizationResult(null);
  }

  function rememberSelectedList(listId: number | null) {
    if (typeof window === "undefined") {
      return;
    }

    if (listId === null) {
      window.localStorage.removeItem(selectedListStorageKey);
      return;
    }

    window.localStorage.setItem(
      selectedListStorageKey,
      String(listId),
    );
  }

  function stopBarcodeScanner() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setBarcodeLoading(false);

    const videoElement = videoRef.current;

    if (videoElement?.srcObject instanceof MediaStream) {
      for (const track of videoElement.srcObject.getTracks()) {
        track.stop();
      }

      videoElement.srcObject = null;
    }
  }

  useEffect(() => {
    let active = true;
    const requestId = ++listRequestIdRef.current;

    async function loadLists() {
      setLoading(true);
      setError("");

      try {
        const data = await shoppingListService.getLists();

        if (
          !active ||
          requestId !== listRequestIdRef.current
        ) {
          return;
        }

        setLists(data);

        if (data.length === 0) {
          setSelectedList(null);
          setItems([]);
          rememberSelectedList(null);
          return;
        }

        const storedListId =
          typeof window === "undefined"
            ? null
            : Number(
                window.localStorage.getItem(
                  selectedListStorageKey,
                ),
              );

        const listToOpen =
          data.find(
            (list) =>
              Number.isFinite(storedListId) &&
              list.id === storedListId,
          ) ?? data[0];

        const listWithItems =
          await shoppingListService.getListWithItems(
            listToOpen.id,
          );

        if (
          !active ||
          requestId !== listRequestIdRef.current
        ) {
          return;
        }

        setSelectedList(listToOpen);
        setItems(listWithItems.items);
        rememberSelectedList(listToOpen.id);
      } catch (loadError) {
        if (
          !active ||
          requestId !== listRequestIdRef.current
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Alışveriş listeleri yüklenemedi.",
        );
      } finally {
        if (
          active &&
          requestId === listRequestIdRef.current
        ) {
          setLoading(false);
        }
      }
    }

    void loadLists();

    return () => {
      active = false;
      stopBarcodeScanner();
    };
  }, []);

  async function handleSelectList(list: ShoppingList) {
    if (
      loading ||
      selectedList?.id === list.id
    ) {
      return;
    }

    const requestId = ++listRequestIdRef.current;

    stopBarcodeScanner();
    clearFeedback();
    clearOptimizationResult();
    setLoading(true);

    try {
      const listWithItems =
        await shoppingListService.getListWithItems(list.id);

      if (requestId !== listRequestIdRef.current) {
        return;
      }

      setSelectedList(list);
      setItems(listWithItems.items);
      rememberSelectedList(list.id);
    } catch (selectError) {
      if (requestId !== listRequestIdRef.current) {
        return;
      }

      setError(
        selectError instanceof Error
          ? selectError.message
          : "Alışveriş listesi açılamadı.",
      );
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoading(false);
      }
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
    clearFeedback();
    clearOptimizationResult();

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
      rememberSelectedList(createdList.id);
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
    clearFeedback();
    clearOptimizationResult();

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
      setMessage(
        `${createdItem.product_name} listeye eklendi.`,
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
    clearFeedback();
    clearOptimizationResult();

    try {
      const createdItem =
        await shoppingListService.addItem({
          listId: selectedList.id,
          productName: cleanedProductName,
          barcode: barcode?.trim() || null,
          imageUrl: imageUrl?.trim() || null,
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
    if (processingItemId !== null) {
      return;
    }

    setProcessingItemId(item.id);
    clearFeedback();
    clearOptimizationResult();

    try {
      const nextCompletedValue = !item.is_completed;

      await shoppingListService.updateItemCompletion(
        item.id,
        nextCompletedValue,
      );

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                is_completed: nextCompletedValue,
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
    if (processingItemId !== null) {
      return;
    }

    setProcessingItemId(item.id);
    clearFeedback();
    clearOptimizationResult();

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
    if (!selectedList || loading) {
      return;
    }

    const shouldDelete = window.confirm(
      `"${selectedList.name}" listesini silmek istediğinize emin misiniz?`,
    );

    if (!shouldDelete) {
      return;
    }

    const removedListId = selectedList.id;
    const remainingLists = lists.filter(
      (list) => list.id !== removedListId,
    );

    setLoading(true);
    clearFeedback();
    clearOptimizationResult();
    stopBarcodeScanner();

    try {
      await shoppingListService.removeList(removedListId);

      setLists(remainingLists);

      if (remainingLists.length === 0) {
        setSelectedList(null);
        setItems([]);
        rememberSelectedList(null);
      } else {
        const nextList = remainingLists[0];
        const listWithItems =
          await shoppingListService.getListWithItems(
            nextList.id,
          );

        setSelectedList(nextList);
        setItems(listWithItems.items);
        rememberSelectedList(nextList.id);
      }

      setMessage("Alışveriş listesi silindi.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Alışveriş listesi silinemedi.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOptimizeBasket() {
    if (optimizationLoading) {
      return;
    }

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
    clearFeedback();

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

      setOptimizationResult(result);

      if (result.items.length === 0) {
        setMessage(
          "Ürünler için güvenilir bir market eşleşmesi bulunamadı.",
        );
      } else {
        setMessage(
          `${result.items.length} ürün başarıyla optimize edildi. Toplam tutar: ${result.total.toLocaleString(
            "tr-TR",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )} ₺`,
        );
      }
    } catch (optimizationError) {
      setOptimizationResult(null);
      setError(
        optimizationError instanceof Error
          ? optimizationError.message
          : "Market optimizasyonu başarısız oldu.",
      );
    } finally {
      setOptimizationLoading(false);
    }
  }

  async function handleScanBarcode() {
    if (barcodeLoading) {
      stopBarcodeScanner();
      return;
    }

    if (!selectedList) {
      setError("Önce bir alışveriş listesi oluşturun.");
      return;
    }

    let barcodeRead = false;

    try {
      clearFeedback();
      setBarcodeLoading(true);

      const devices =
        await BrowserMultiFormatReader.listVideoInputDevices();

      if (devices.length === 0) {
        throw new Error("Kamera bulunamadı.");
      }

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const videoElement = videoRef.current;

      if (!videoElement) {
        throw new Error("Kamera görüntü alanı hazır değil.");
      }

      const selectedDevice =
        devices.find((device) =>
          /back|rear|environment|arka/i.test(
            device.label,
          ),
        ) ?? devices[0];

      const controls =
        await barcodeReader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoElement,
          async (result) => {
            if (!result || barcodeRead) {
              return;
            }

            barcodeRead = true;
            stopBarcodeScanner();

            const barcode = result.getText().trim();

            try {
              const response = await fetch(
                `/api/barcode?barcode=${encodeURIComponent(
                  barcode,
                )}`,
                {
                  cache: "no-store",
                },
              );

              const data = (await response.json()) as {
                success?: boolean;
                error?: string;
                product?: {
                  product_name?: string;
                  image_url?: string | null;
                };
              };

              if (
                !response.ok ||
                !data.success ||
                !data.product?.product_name
              ) {
                setError(
                  data.error ??
                    `Barkod okundu ancak ürün bulunamadı: ${barcode}`,
                );
                return;
              }

              await addProductToSelectedList(
                data.product.product_name,
                barcode,
                data.product.image_url ?? null,
              );
            } catch (lookupError) {
              console.error(
                "Barkod ürün sorgulama hatası:",
                lookupError,
              );
              setError(
                "Barkod okundu ancak ürün bilgisi alınamadı.",
              );
            }
          },
        );

      scannerControlsRef.current = controls;
    } catch (scanError) {
      console.error("Kamera hatası:", scanError);
      stopBarcodeScanner();
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Kamera açılamadı.",
      );
    }
  }

  const completedCount = items.filter(
    (item) => item.is_completed,
  ).length;

  const progress =
    items.length === 0
      ? 0
      : Math.round(
          (completedCount / items.length) * 100,
        );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "42px 20px 70px",
        background:
          "radial-gradient(circle at top, #172554 0%, #0f172a 38%, #020617 100%)",
        color: "#f8fafc",
      }}
    >
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
            role={error ? "alert" : "status"}
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

        {barcodeLoading && (
          <section
            style={{
              marginBottom: "20px",
              padding: "16px",
              borderRadius: "16px",
              background: "#111827",
              border: "1px solid #334155",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <strong>Kamerayı barkoda doğrultun</strong>

              <button
                type="button"
                onClick={stopBarcodeScanner}
                style={{
                  padding: "8px 11px",
                  border:
                    "1px solid rgba(248, 113, 113, 0.35)",
                  borderRadius: "9px",
                  backgroundColor:
                    "rgba(127, 29, 29, 0.22)",
                  color: "#fecaca",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Kamerayı Kapat
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxHeight: "440px",
                objectFit: "cover",
                borderRadius: "12px",
                backgroundColor: "#020617",
              }}
            />
          </section>
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

            {loading && lists.length === 0 ? (
              <div
                style={{
                  padding: "22px 14px",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                Listeler yükleniyor...
              </div>
            ) : lists.length === 0 ? (
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
                      disabled={loading}
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
                        cursor: loading
                          ? "wait"
                          : "pointer",
                        opacity: loading ? 0.7 : 1,
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
                    disabled={loading}
                    style={{
                      padding: "10px 13px",
                      border:
                        "1px solid rgba(248, 113, 113, 0.35)",
                      borderRadius: "10px",
                      backgroundColor:
                        "rgba(127, 29, 29, 0.22)",
                      color: "#fecaca",
                      fontWeight: 800,
                      cursor: loading ? "wait" : "pointer",
                      opacity: loading ? 0.7 : 1,
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
                      "minmax(180px, 1fr) 95px 110px auto auto",
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
                    disabled={addingItem || loading}
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
                    disabled={addingItem || loading}
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
                    disabled={addingItem || loading}
                    style={{
                      minWidth: 0,
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
                    onClick={() =>
                      void handleScanBarcode()
                    }
                    disabled={addingItem || loading}
                    style={{
                      padding: "12px 16px",
                      border:
                        "1px solid rgba(59, 130, 246, 0.35)",
                      borderRadius: "11px",
                      background: barcodeLoading
                        ? "rgba(127, 29, 29, 0.22)"
                        : "rgba(37, 99, 235, 0.15)",
                      color: barcodeLoading
                        ? "#fecaca"
                        : "#bfdbfe",
                      fontWeight: 800,
                      cursor:
                        addingItem || loading
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {barcodeLoading
                      ? "Kamerayı Kapat"
                      : "📷 Barkod Oku"}
                  </button>

                  <button
                    type="submit"
                    disabled={addingItem || loading}
                    style={{
                      padding: "12px 16px",
                      border: "none",
                      borderRadius: "11px",
                      background:
                        addingItem || loading
                          ? "#475569"
                          : "linear-gradient(135deg, #22c55e, #14b8a6)",
                      color:
                        addingItem || loading
                          ? "#cbd5e1"
                          : "#052e16",
                      fontWeight: 900,
                      cursor:
                        addingItem || loading
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

                            {item.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image_url}
                                alt=""
                                width={60}
                                height={60}
                                loading="lazy"
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  flexShrink: 0,
                                  objectFit: "contain",
                                  borderRadius: "8px",
                                  background: "#ffffff",
                                  padding: "4px",
                                }}
                              />
                            )}

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
                          Tamamlanmamış ürünler için en ucuz
                          market kombinasyonunu hesaplayacağız.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleOptimizeBasket()
                        }
                        disabled={
                          optimizationLoading ||
                          loading
                        }
                        style={{
                          padding: "12px 16px",
                          border: "none",
                          borderRadius: "11px",
                          backgroundColor:
                            optimizationLoading ||
                            loading
                              ? "#475569"
                              : "#2563eb",
                          color: "#ffffff",
                          fontWeight: 800,
                          cursor:
                            optimizationLoading ||
                            loading
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

                <ShoppingOptimizationResultCard
                  result={optimizationResult}
                />
              </>
            )}
          </section>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 980px) {
          .item-form {
            grid-template-columns:
              minmax(180px, 1fr) 90px 105px !important;
          }

          .item-form button {
            width: 100%;
          }
        }

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
