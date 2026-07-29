export type Opportunity = {
  id: number;
  productName: string;
  store: string;
  price: string;
  savings: string;
  badge: string;
  description: string;
};

export const opportunities: Opportunity[] = [
  {
    id: 1,
    productName: "iPhone 15",
    store: "Teknosa",
    price: "₺54.999",
    savings: "%12 indirim",
    badge: "En iyi teklif",
    description: "Yüksek performanslı kamera ve uzun pil ömrü sunan akıllı telefon.",
  },
  {
    id: 2,
    productName: "MacBook Air M2",
    store: "MediaMarkt",
    price: "₺39.999",
    savings: "%18 tasarruf",
    badge: "Sınırlı stok",
    description: "Hafif tasarımı ve güçlü işlemcisiyle günlük kullanım için ideal seçenek.",
  },
  {
    id: 3,
    productName: "Samsung Galaxy S24",
    store: "Vatan Bilgisayar",
    price: "₺31.499",
    savings: "%10 indirim",
    badge: "Yeni sezon",
    description: "Yüksek çözünürlüklü ekranı ve yapay zeka destekli özellikleriyle dikkat çekiyor.",
  },
  {
    id: 4,
    productName: "Sony WH-1000XM5",
    store: "Hepsiburada",
    price: "₺16.899",
    savings: "%15 tasarruf",
    badge: "Popüler ürün",
    description: "Sessiz çalışma ve seyahat deneyimi için güçlü aktif gürültü engelleme.",
  },
  {
    id: 5,
    productName: "Dell XPS 13",
    store: "N11",
    price: "₺44.990",
    savings: "%9 indirim",
    badge: "Ofis favorisi",
    description: "Portatif tasarımı ve güçlü performansı ile kullanıcıları cezbediyor.",
  },
];
