export const tableStat = {
  free: "#8eac56",
  occupied: "#ff6a6ae8",
  reserved: "#ffb65f",
  'order ongoing': "#f9b931"
}

export const loaderStyle = { width: 20, height: 20 }
export const centerBtn = { display: 'flex', placeContent: 'center' }

export const dataTableStyle = {
  rows: {
    style: {
      fontSize: "16px",   // row text
    },
  },
  headCells: {
    style: {
      fontSize: "18px",   // header text
      fontWeight: "bold",
    },
  },
  cells: {
    style: {
      fontSize: "16px",   // body cells text
    },
  },
};

export const tableStyle = {
  background: '#c8b6a6',
  border: "2px solid #000",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  cursor: "pointer",
  color: "#fff",
  position: "absolute"
}

export const goToPOS = {
  marginTop: 15,
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
}

export const nonKitchenItems = [
  'drink',
  'beverage',
  'juice',
  'cocktail',
  'smoothie',
  'tea',
  'coffee',
  'milk',
  'soda',
  'water',
  'soft drink',
  'wine',
  'beer',
  'alcohol',
  'desserts', 
];

export const tastes = [
  { label: "Mild", emoji: "😌", sub: "No heat" },
  { label: "Medium", emoji: "🌶️", sub: "Some kick" },
  { label: "Hot", emoji: "🌶️🌶️", sub: "Spicy" },
  { label: "Berbere", emoji: "🔥", sub: "Very hot" },
]