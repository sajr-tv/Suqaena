(async function(){
  const groups=[
    {id:'suqaena-lawn-track',urls:['/shop/unstitched/lawn','/shop?category=Embroidered%20Lawn%20and%20Chiffon']},
    {id:'suqaena-stitched-track',urls:['/shop?category=Ready-to-Wear&type=three-piece','/shop?category=Ready-to-Wear','/shop/ready-to-wear']},
    {id:'suqaena-unstitched-track',urls:['/shop/unstitched/chiffon','/shop/unstitched/lawn','/shop/unstitched/cotton','/shop/unstitched/silk','/shop?category=Unstitched%202-Piece%20and%203-Piece%20Suits']}
  ];
  async function load(url,products){
    try{
      const response=await fetch(url,{credentials:'same-origin'});
      if(!response.ok)return;
      const doc=new DOMParser().parseFromString(await response.text(),'text/html');
      for(const card of doc.querySelectorAll('article.fashion-card,article.product-card,.product-card')){
        const link=card.querySelector('a.fashion-image[href],a[href^="/shop/dress/"],a[href^="/shop/product/"]');
        const img=link?.querySelector('img')||card.querySelector('img');
        const title=card.querySelector('h2,h3')?.textContent?.trim()||img?.alt?.trim();
        const href=link?.getAttribute('href'),src=img?.getAttribute('src');
        if(!href||!src||!title||products.has(href))continue;
        if(!href.startsWith('/shop/dress/')&&!href.startsWith('/shop/product/'))continue;
        products.set(href,{href,src:new URL(src,location.origin).href,title});
      }
    }catch(error){console.warn('SUQAENA collection unavailable',url,error)}
  }
  function makeCard(product,duplicate){
    const link=document.createElement('a');link.className='suqaena-conveyor-card';link.href=product.href;
    if(duplicate){link.setAttribute('aria-hidden','true');link.tabIndex=-1}
    const img=document.createElement('img');img.src=product.src;img.alt=product.title;img.loading='lazy';
    const name=document.createElement('strong');name.textContent=product.title;link.append(img,name);return link;
  }
  await Promise.all(groups.map(async group=>{
    const track=document.getElementById(group.id);if(!track)return;
    const products=new Map();
    for(const url of group.urls)await load(url,products);
    if(!products.size){track.textContent='Dresses are being updated. Select Shop Collection to browse.';track.style.animation='none';return}
    const items=[...products.values()];
    for(const product of items)track.append(makeCard(product,false));
    if(items.length>1){for(const product of items)track.append(makeCard(product,true));track.style.animationDuration=Math.max(45,items.length*5)+'s'}
    else track.style.animation='none';
  }));
})();