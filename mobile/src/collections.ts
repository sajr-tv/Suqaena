export type Collection = { id: string; name: string; image: number; group: 'Collections' | 'Designer looks' };
export const collections: Collection[] = [
  { id: 'unstitched', name: 'Unstitched Suits', image: require('../assets/unstitched.jpg'), group: 'Collections' },
  { id: 'ready', name: 'Ready to Wear', image: require('../assets/ready.jpg'), group: 'Collections' },
  { id: 'luxury', name: 'Luxury Pret', image: require('../assets/luxury.jpg'), group: 'Collections' },
  { id: 'festive', name: 'Festive Collection', image: require('../assets/festive.jpg'), group: 'Collections' },
  { id: 'abayas', name: 'Abayas & Kaftans', image: require('../assets/abayas.jpg'), group: 'Collections' },
  { id: 'accessories', name: 'Accessories', image: require('../assets/accessories.jpg'), group: 'Collections' },
  { id: 'mariab', name: 'MariaB Inspired', image: require('../assets/mariab.jpg'), group: 'Designer looks' },
  { id: 'sana', name: 'Sana Safinaz Inspired', image: require('../assets/sana.jpg'), group: 'Designer looks' },
  { id: 'elan', name: 'ÉLAN Inspired', image: require('../assets/elan.jpg'), group: 'Designer looks' },
  { id: 'asim', name: 'Asim Jofa Inspired', image: require('../assets/asim.jpg'), group: 'Designer looks' },
];
