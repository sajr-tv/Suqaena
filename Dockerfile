FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js analytics.js commerce.js supplier-memo.js stripe-checkout.js ./
COPY public ./public
COPY ["Suqaena-Royal-Midnight-Teal-Floral-Suit-Front.png", "Suqaena-Royal-Midnight-Teal-Floral-Suit-Side.png", "Suqaena-Royal-Midnight-Teal-Floral-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Lavender-Pearl-Suit-Front.png", "Suqaena-Royal-Lavender-Pearl-Suit-Side.png", "Suqaena-Royal-Lavender-Pearl-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Ivory-Blue-Gold-Floral-Suit.png", "Suqaena-Royal-Ivory-Blue-Gold-Floral-Suit-Side.png", "Suqaena-Royal-Ivory-Blue-Gold-Floral-Suit-Front.png", "./public/"]
COPY ["Suqaena-Royal-Ivory-Blush-Pink-Floral-Suit-Front.png", "Suqaena-Royal-Ivory-Blush-Pink-Floral-Suit-Side.png", "Suqaena-Royal-Ivory-Blush-Pink-Floral-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Dusty-Rose-Pink-Gold-Floral-Suit-Front.png", "Suqaena-Royal-Dusty-Rose-Pink-Gold-Floral-Suit-Side.png", "Suqaena-Royal-Dusty-Rose-Pink-Gold-Floral-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Blush-Pink-Ivory-Lace-Suit-Front.png", "Suqaena-Royal-Blush-Pink-Ivory-Lace-Suit-Side.png", "Suqaena-Royal-Blush-Pink-Ivory-Lace-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Mint-Seafoam-Ivory-Suit-Front.png", "Suqaena-Royal-Mint-Seafoam-Ivory-Suit-Side.png", "Suqaena-Royal-Mint-Seafoam-Ivory-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Midnight-Black-Gold-Striped-Suit-Front.png", "Suqaena-Royal-Midnight-Black-Gold-Striped-Suit-Side.png", "Suqaena-Royal-Midnight-Black-Gold-Striped-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Emerald-Ivory-Floral-Suit-Front.png", "Suqaena-Royal-Emerald-Ivory-Floral-Suit-Side.png", "Suqaena-Royal-Emerald-Ivory-Floral-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Deep-Plum-Gold-Suit-Front.png", "Suqaena-Royal-Deep-Plum-Gold-Suit-Side.png", "Suqaena-Royal-Deep-Plum-Gold-Suit-Closeu.png", "./public/"]
COPY ["Suqaena-Royal-Emerald-Green-Gold-Suit-Front.png", "Suqaena-Royal-Emerald-Green-Gold-Suit-Side.png", "Suqaena-Royal-Emerald-Green-Gold-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Midnight-Teal-Gold-Suit-Front.png", "Suqaena-Royal-Midnight-Teal-Gold-Suit-Side.png", "Suqaena-Royal-Midnight-Teal-Gold-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Plum-Magenta-Gold-Suit-Front.png", "Suqaena-Royal-Plum-Magenta-Gold-Suit-Side.png", "Suqaena-Royal-Plum-Magenta-Gold-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Ivory-Floral-Lace-Suit-Front.png", "Suqaena-Royal-Ivory-Floral-Lace-Suit-Side.png", "Suqaena-Royal-Ivory-Floral-Lace-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Midnight-Black-Floral-Suit-Front.png", "Suqaena-Royal-Midnight-Black-Floral-Suit-Side.png", "Suqaena-Royal-Midnight-Black-Floral-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Fuchsia-Magenta-Suit-Front.png", "Suqaena-Royal-Fuchsia-Magenta-Suit-Side.png", "Suqaena-Royal-Fuchsia-Magenta-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Seafoam-Blue-Ivory-Suit-Front.png", "Suqaena-Royal-Seafoam-Blue-Ivory-Suit-Side.png", "Suqaena-Royal-Seafoam-Blue-Ivory-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Blush-Pink-Shimmer-Suit-Front.png", "Suqaena-Royal-Blush-Pink-Shimmer-Suit-Side.png", "Suqaena-Royal-Blush-Pink-Shimmer-Suit-Closeup.png", "./public/"]
COPY ["Suqaena-Royal-Blush-Pink-Shimmer-Suit-Front.png", "Suqaena-Royal-Blush-Pink-Shimmer-Suit-Side.png", "Suqaena-Royal-Blush-Pink-Shimmer-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Deep-Purple-Ivory-Suit-Front.png", "Suqaena-Royal-Deep-Purple-Ivory-Suit-Side.png", "Suqaena-Royal-Deep-Purple-Ivory-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Crimson-Red-Embroidered-Suit-Fron.png", "Suqaena-Royal-Crimson-Red-Embroidered-Suit-Side.png", "Suqaena-Royal-Crimson-Red-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Midnight-Navy-Gold-Suit-Front.png", "Suqaena-Royal-Midnight-Navy-Gold-Suit-Side.png", "Suqaena-Royal-Midnight-Navy-Gold-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Ruby-Magenta-Blush-Pink-Suit-Front.png", "Suqaena-Royal-Ruby-Magenta-Blush-Pink-Suit-Sid.png", "Suqaena-Royal-Ruby-Magenta-Blush-Pink-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Ivory-Gold-Blush-Pink-Suit-Front.png", "Suqaena-Royal-Ivory-Gold-Blush-Pink-Suit-Side.png", "Suqaena-Royal-Ivory-Gold-Blush-Pink-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Midnight-Blue-Embroidered-Suit-Front.png", "Suqaena-Royal-Midnight-Blue-Embroidered-Suit-Sid.png", "Suqaena-Royal-Midnight-Blue-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Teal-Burgundy-Embroidered-Suit.png", "Suqaena-Royal-Teal-Burgundy-Embroidered-Suit-Side.png", "Suqaena-Royal-Teal-Burgundy-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Burgundy-Embroidered-Suit-Front.png", "Suqaena-Royal-Burgundy-Embroidered-Suit-Side.png", "Suqaena-Royal-Burgundy-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Emerald-Green-Embroidered-Suit-Front.png", "Suqaena-Royal-Emerald-Green-Embroidered-Suit-Side.png", "Suqaena-Royal-Emerald-Green-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Seafoam-Teal-Pastel-Pink-Suit-Front.png", "Suqaena-Seafoam-Teal-Pastel-Pink-Suit-Side.png", "Suqaena-Seafoam-Teal-Pastel-Pink-Suit-Closeup.png", "./"]
COPY ["Suqaena-Blush-Pink-Rose-Floral-Suit-Front.png", "Suqaena-Blush-Pink-Rose-Floral-Suit-Side.png", "Suqaena-Blush-Pink-Rose-Floral-Suit-Closeup.png", "./"]
COPY ["Suqaena-Champagne-Gold-Burgundy-Suit-Fron.png", "Suqaena-Champagne-Gold-Burgundy-Suit-Side.png", "Suqaena-Champagne-Gold-Burgundy-Suit-Closeup.png", "./"]
COPY ["Suqaena-Champagne-Beige-Ruby-Red-Suit-Fron.png", "Suqaena-Champagne-Beige-Ruby-Red-Suit-Side.png", "Suqaena-Champagne-Beige-Ruby-Red-Suit-Closeup.png", "./"]
COPY ["Suqaena-Emerald-Green-Gold-Embroidered-Suit-Front.png", "Suqaena-Emerald-Green-Gold-Embroidered-Suit-Side.png", "Suqaena-Emerald-Green-Gold-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Maroon-Gold-Embroidered-Suit-Front.png", "Suqaena-Royal-Maroon-Gold-Embroidered-Suit-Side.png", "Suqaena-Royal-Maroon-Gold-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Champagne-Peach-Gold-Embroidered-Suit-Fron.png", "Suqaena-Champagne-Peach-Gold-Embroidered-Suit-Side.png", "Suqaena-Champagne-Peach-Gold-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Teal-Gold-Embroidered-Suit-Front.png", "Suqaena-Royal-Teal-Gold-Embroidered-Suit-Side.png", "Suqaena-Royal-Teal-Gold-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Royal-Magenta-Gold-Embroidered-Suit-Fron.png", "Suqaena-Royal-Magenta-Gold-Embroidered-Suit-Side.png", "Suqaena-Royal-Magenta-Gold-Embroidered-Suit-Closeup.png", "./"]
COPY ["Suqaena-Midnight-Noir-Black-Ivory-Suit-Fron.png", "Suqaena-Midnight-Noir-Black-Ivory-Suit-Side.png", "Suqaena-Midnight-Noir-Black-Ivory-Suit-Closeup.png", "./"]
COPY ["Suqaena-Olive-Green-Pink-Embroidered-Unstitched-Suit-Front.png", "Suqaena-Olive-Green-Pink-Embroidered-Unstitched-Suit-Side.png", "Suqaena-Olive-Green-Pink-Embroidered-Unstitched-Suit-Closeup.png", "./"]
COPY ["suqaena-emerald-green-luxury-main.png", "suqaena-emerald-green-luxury-side.png", "suqaena-emerald-green-luxury-closeup.png", "./"]
COPY ["suqaena-ivory-royal-blue-main.png", "suqaena-ivory-royal-blue-side.png", "suqaena-ivory-royal-blue-closeup.png", "./"]
COPY ["suqaena-blush-pink-embroidered-main..png", "suqaena-blush-pink-embroidered-side.png", "suqaena-blush-pink-embroidered-closeup.png", "./"]
COPY ["suqaena-royal-teal-gold-main.png", "suqaena-royal-teal-gold-side.png", "suqaena-royal-teal-gold-closeup.png", "./"]
COPY ["suqaena-midnight-navy-chiffon-main.png", "suqaena-midnight-navy-chiffon-side.png", "suqaena-midnight-navy-chiffon-closeup.png", "./"]
COPY ["suqaena-olive-green-embroidered-main.png", "suqaena-olive-green-embroidered-side.png", "suqaena-olive-green-embroidered-closeup.png", "./"]
COPY ["suqaena-teal-zari-sequence-main.png", "suqaena-teal-zari-sequence-side.png", "suqaena-teal-zari-sequence-closeup.png", "./"]
COPY ["suqaena-pastel-pink-embroidered-main.png", "suqaena-pastel-pink-embroidered-side.png", "suqaena-pastel-pink-embroidered-detail.png", "./"]
COPY ["suqaena-ivory-green-lawn-main.png", "suqaena-ivory-green-lawn-side.png", "suqaena-ivory-green-lawn-detail.png", "./"]
COPY ["suqaena-powder-blue-elaf-main.png", "suqaena-powder-blue-elaf-side.png", "suqaena-powder-blue-elaf-detail.png", "./"]
COPY ["suqaena-cream-pink-floral-main.png", "suqaena-cream-pink-floral-side.png", "suqaena-cream-pink-floral-detail.png", "./"]
COPY ["suqaena-cream-blue-lawn-main.png", "suqaena-cream-blue-lawn-side.png", "suqaena-cream-blue-lawn-detail.png", "./"]
COPY ["suqaena-burgundy-lawn-main.png", "suqaena-burgundy-lawn-side.png", "suqaena-burgundy-lawn-detail.png", "./"]
COPY ["Mint Elegance in a Grand Interior.png", "Luxury Mint-Green Embroidered Ensemble.png", "Luxury Mint Embroidered Fashion Portrait.png", "./"]
COPY suqaena-leranath-yellow-suit.png ./suqaena-leranath-yellow-suit.png
COPY suqaena-leranath-yellow-suit-side.png ./suqaena-leranath-yellow-suit-side.png
COPY suqaena-leranath-yellow-suit-detail.png ./suqaena-leranath-yellow-suit-detail.png
COPY suqaena-maroon-embroidered-suit-main.png ./suqaena-maroon-embroidered-suit-main.png
COPY suqaena-maroon-embroidered-suit-side.png ./suqaena-maroon-embroidered-suit-side.png
COPY suqaena-maroon-embroidered-suit-detail.png ./suqaena-maroon-embroidered-suit-detail.png
COPY suqaena-lemon-yellow-party-suit-main.png ./suqaena-lemon-yellow-party-suit-main.png
COPY suqaena-lemon-yellow-party-suit-side.png ./suqaena-lemon-yellow-party-suit-side.png
COPY suqaena-lemon-yellow-party-suit-detail.png ./suqaena-lemon-yellow-party-suit-detail.png
COPY suqaena-cream-mustard-suit-main.png ./suqaena-cream-mustard-suit-main.png
COPY suqaena-cream-mustard-suit-side.png ./suqaena-cream-mustard-suit-side.png
COPY suqaena-cream-mustard-suit-detail.png ./suqaena-cream-mustard-suit-detail.png
COPY suqaena-blue-floral-anarkali-main.png ./suqaena-blue-floral-anarkali-main.png
COPY suqaena-blue-floral-anarkali-side.png ./suqaena-blue-floral-anarkali-side.png
COPY suqaena-blue-floral-anarkali-detail.png ./suqaena-blue-floral-anarkali-detail.png
COPY suqaena-purple-anarkali-main.png ./suqaena-purple-anarkali-main.png
COPY suqaena-purple-anarkali-side.png ./suqaena-purple-anarkali-side.png
COPY suqaena-purple-anarkali-detail.png ./suqaena-purple-anarkali-detail.png
COPY suqaena-pink-anarkali-main.png ./suqaena-pink-anarkali-main.png
COPY suqaena-pink-anarkali-side.png ./suqaena-pink-anarkali-side.png
COPY suqaena-pink-anarkali-detail.png ./suqaena-pink-anarkali-detail.png
COPY suqaena-white-floral-anarkali-main.png ./suqaena-white-floral-anarkali-main.png
COPY suqaena-white-floral-anarkali-side.png ./suqaena-white-floral-anarkali-side.png
COPY suqaena-white-floral-anarkali-detail.png ./suqaena-white-floral-anarkali-detail.png
COPY suqaena-indigo-bloom-suit-main.png ./suqaena-indigo-bloom-suit-main.png
COPY suqaena-indigo-bloom-suit-side.png ./suqaena-indigo-bloom-suit-side.png
COPY suqaena-indigo-bloom-suit-detail.png ./suqaena-indigo-bloom-suit-detail.png
COPY suqaena-rose-bloom-anarkali-main.png ./suqaena-rose-bloom-anarkali-main.png
COPY suqaena-rose-bloom-anarkali-side.png ./suqaena-rose-bloom-anarkali-side.png
COPY suqaena-rose-bloom-anarkali-detail.png ./suqaena-rose-bloom-anarkali-detail.png
COPY suqaena-ivory-floral-anarkali-main.png ./suqaena-ivory-floral-anarkali-main.png
COPY suqaena-ivory-floral-anarkali-side.png ./suqaena-ivory-floral-anarkali-side.png
COPY suqaena-ivory-floral-anarkali-detail.png ./suqaena-ivory-floral-anarkali-detail.png
COPY suqaena-ivory-navy-embroidered-main.png ./suqaena-ivory-navy-embroidered-main.png
COPY suqaena-ivory-navy-embroidered-side.png ./suqaena-ivory-navy-embroidered-side.png
COPY suqaena-ivory-navy-embroidered-detail.png ./suqaena-ivory-navy-embroidered-detail.png
COPY suqaena-lavender-bloom-anarkali-main.png ./suqaena-lavender-bloom-anarkali-main.png
COPY suqaena-lavender-bloom-anarkali-side.png ./suqaena-lavender-bloom-anarkali-side.png
COPY suqaena-lavender-bloom-anarkali-detail.png ./suqaena-lavender-bloom-anarkali-detail.png
COPY suqaena-ivory-gold-sharara-main.png ./suqaena-ivory-gold-sharara-main.png
COPY suqaena-ivory-gold-sharara-side.png ./suqaena-ivory-gold-sharara-side.png
COPY suqaena-ivory-gold-sharara-detail.png ./suqaena-ivory-gold-sharara-detail.png
COPY suqaena-turquoise-blossom-suit-main.png ./suqaena-turquoise-blossom-suit-main.png
COPY suqaena-turquoise-blossom-suit-side.png ./suqaena-turquoise-blossom-suit-side.png
COPY suqaena-turquoise-blossom-suit-detail.png ./suqaena-turquoise-blossom-suit-detail.png
COPY suqaena-blush-peacock-anarkali-main.png ./suqaena-blush-peacock-anarkali-main.png
COPY suqaena-blush-peacock-anarkali-side.png ./suqaena-blush-peacock-anarkali-side.png
COPY suqaena-blush-peacock-anarkali-detail.png ./suqaena-blush-peacock-anarkali-detail.png
COPY suqaena-ivory-floral-satin-main.png ./suqaena-ivory-floral-satin-main.png
COPY suqaena-ivory-floral-satin-side.png ./suqaena-ivory-floral-satin-side.png
COPY suqaena-ivory-floral-satin-detail.png ./suqaena-ivory-floral-satin-detail.png
COPY suqaena-velora-maroon-elegance-main.png ./suqaena-velora-maroon-elegance-main.png
COPY suqaena-velora-maroon-elegance-side.png ./suqaena-velora-maroon-elegance-side.png
COPY suqaena-velora-maroon-elegance-detail.png ./suqaena-velora-maroon-elegance-detail.png
COPY suqaena-mustard-floral-suit-main.png ./suqaena-mustard-floral-suit-main.png
COPY suqaena-mustard-floral-suit-side.png ./suqaena-mustard-floral-suit-side.png
COPY suqaena-mustard-floral-suit-detail.png ./suqaena-mustard-floral-suit-detail.png
COPY suqaena-ivory-champagne-suit-main.png ./suqaena-ivory-champagne-suit-main.png
COPY suqaena-ivory-champagne-suit-side.png ./suqaena-ivory-champagne-suit-side.png
COPY suqaena-ivory-champagne-suit-detail.png ./suqaena-ivory-champagne-suit-detail.png
COPY suqaena-teal-floral-lawn-main.png ./suqaena-teal-floral-lawn-main.png
COPY suqaena-teal-floral-lawn-side.png ./suqaena-teal-floral-lawn-side.png
COPY suqaena-teal-floral-lawn-detail.png ./suqaena-teal-floral-lawn-detail.png
COPY suqaena-mint-floral-lawn-main.png ./suqaena-mint-floral-lawn-main.png
COPY suqaena-mint-floral-lawn-side.png ./suqaena-mint-floral-lawn-side.png
COPY suqaena-mint-floral-lawn-detail.png ./suqaena-mint-floral-lawn-detail.png
COPY suqaena-ivory-multicolor-lawn-main.png ./suqaena-ivory-multicolor-lawn-main.png
COPY suqaena-ivory-multicolor-lawn-side.png ./suqaena-ivory-multicolor-lawn-side.png
COPY suqaena-ivory-multicolor-lawn-detail.png ./suqaena-ivory-multicolor-lawn-detail.png
COPY suqaena-black-multicolor-lawn-main.png ./suqaena-black-multicolor-lawn-main.png
COPY suqaena-black-multicolor-lawn-side.png ./suqaena-black-multicolor-lawn-side.png
COPY suqaena-black-multicolor-lawn-detail.png ./suqaena-black-multicolor-lawn-detail.png
COPY suqaena-blush-pink-crepe-main.png ./suqaena-blush-pink-crepe-main.png
COPY suqaena-blush-pink-crepe-side.png ./suqaena-blush-pink-crepe-side.png
COPY suqaena-blush-pink-crepe-detail.png ./suqaena-blush-pink-crepe-detail.png
COPY suqaena-ivory-floral-embroidered-main.png ./suqaena-ivory-floral-embroidered-main.png
COPY suqaena-ivory-floral-embroidered-side.png ./suqaena-ivory-floral-embroidered-side.png
COPY suqaena-ivory-floral-embroidered-detail.png ./suqaena-ivory-floral-embroidered-detail.png
COPY suqaena-champagne-beige-embroidered-main.png ./suqaena-champagne-beige-embroidered-main.png
COPY suqaena-champagne-beige-embroidered-side.png ./suqaena-champagne-beige-embroidered-side.png
COPY suqaena-champagne-beige-embroidered-detail.png ./suqaena-champagne-beige-embroidered-detail.png
USER node
EXPOSE 3000
CMD ["node", "server.js"]

COPY suqaena-ready-to-wear-category-hero.png ./suqaena-ready-to-wear-category-hero.png

COPY suqaena-three-piece-shalwar-suits-category.png ./suqaena-three-piece-shalwar-suits-category.png

COPY suqaena-two-piece-stitched-suits-category.png ./suqaena-two-piece-stitched-suits-category.png

COPY suqaena-sarees-category.png ./suqaena-sarees-category.png

COPY Suqaena-Royal-Mint-Green-Silver-Embroidered-Suit-*.png ./

COPY Suqaena-Royal-Wine-Maroon-Multicolor-Dupatta-*.png ./

COPY Suqaena-Royal-Olive-Gold-Sequin-Suit-*.png ./

COPY Suqaena-Royal-Crimson-Champagne-Floral-Suit-*.png ./

COPY Suqaena-Royal-Powder-Blue-Champagne-Gold-Suit-*.png ./

COPY Suqaena-Royal-Lavender-Pink-Crystal-Suit-*.png ./

COPY Suqaena-Royal-Ivory-Blue-Floral-Suit-*.png ./

COPY Suqaena-Royal-Ivory-Turquoise-Floral-Suit-*.png ./

COPY Suqaena-Royal-Ivory-Blue-Gold-Floral-Suit*.png ./

COPY Suqaena-SQ261118-New-Ivory-Floral-*.png ./

COPY Suqaena-Royal-Mint-Champagne-Gold-261118-*.png ./

COPY Suqaena-Royal-Ivory-Polka-Floral-Black-Lace-261118-*.png ./
