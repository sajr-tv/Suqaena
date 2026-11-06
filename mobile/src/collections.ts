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
  { id: 'imrozia', name: 'Imrozia Inspired', image: require('../assets/imrozia.jpg'), group: 'Designer looks' },
  { id: 'baroque', name: 'Baroque Inspired', image: require('../assets/baroque.jpg'), group: 'Designer looks' },
  { id: 'qalamkar', name: 'Qalamkar Inspired', image: require('../assets/qalamkar.jpg'), group: 'Designer looks' },
  { id: 'zainab', name: 'Zainab Chottani Inspired', image: require('../assets/zainab.jpg'), group: 'Designer looks' },
  { id: 'maryum', name: 'Maryum & Maria Inspired', image: require('../assets/maryum.jpg'), group: 'Designer looks' },
  { id: 'hussain', name: 'Hussain Rehar Inspired', image: require('../assets/hussain.jpg'), group: 'Designer looks' },
];
