export type WorldRoot="fashion"|"fitness"|"skin"|"hair"|"home"|"tech"|"retail";
export type ShopCategory={id:string;label:string;root:WorldRoot;query:string;sub:string[]};

export const SHOP_TAXONOMY:ShopCategory[]=[
 {id:"fashion",label:"Fashion",root:"fashion",query:"fashion clothing style",sub:["Women","Men","Dresses","Tops","Bottoms","Denim","Knitwear","Outerwear","Activewear","Swimwear","Lingerie","Streetwear","Occasionwear","Vintage","Handmade Fashion"]},
 {id:"jewelry",label:"Jewelry & Accessories",root:"fashion",query:"jewelry accessories",sub:["Rings","Necklaces","Earrings","Bracelets","Charms","Fine Jewelry","Handmade Jewelry","Watches","Sunglasses","Hats","Scarves","Belts","Wallets"]},
 {id:"shoes",label:"Shoes",root:"fashion",query:"shoes footwear",sub:["Sneakers","Trainers","Heels","Boots","Sandals","Flats","Loafers","Running Shoes","Hiking Shoes","Slippers","Handmade Shoes"]},
 {id:"bags",label:"Bags & Travel",root:"fashion",query:"bags travel accessories",sub:["Handbags","Shoulder Bags","Crossbody","Tote Bags","Backpacks","Clutches","Travel Bags","Luggage","Laptop Bags","Pouches"]},
 {id:"beauty",label:"Beauty & Personal Care",root:"skin",query:"beauty personal care skincare",sub:["Skincare","Makeup","Hair Care","Hair Accessories","Fragrance","Bath & Body","Nails","Grooming","Beauty Tools","Natural Beauty","Self-Care Sets"]},
 {id:"hair",label:"Hair",root:"hair",query:"hair care styling",sub:["Shampoo","Conditioner","Repair","Scalp Care","Styling","Hair Tools","Volume","Curl Care","Hair Oils","Hair Accessories"]},
 {id:"home",label:"Home & Living",root:"home",query:"home living decor furniture",sub:["Furniture","Home Decor","Lighting","Kitchen","Dining","Bedding","Bathroom","Storage","Rugs","Wall Art","Mirrors","Candles","Garden","Outdoor Living","Handmade Home"]},
 {id:"fitness",label:"Fitness & Sports",root:"fitness",query:"fitness sports activewear",sub:["Activewear","Gym Clothing","Training Gear","Home Gym","Running","Yoga","Pilates","Cycling","Recovery","Outdoor Sports","Sports Accessories"]},
 {id:"tech",label:"Tech & Gadgets",root:"tech",query:"tech gadgets electronics",sub:["Phones","Phone Accessories","Computers","Computer Accessories","Audio","Headphones","Speakers","Gaming","Smart Home","Wearables","Cameras","Desk Tech","Charging","Gadgets"]},
 {id:"gifts",label:"Gifts",root:"retail",query:"gifts handmade personalized",sub:["Gifts for Her","Gifts for Him","Couples","Birthday","Wedding","Anniversary","Baby","Housewarming","Personalized Gifts","Handmade Gifts","Gift Boxes","Stocking Fillers"]},
 {id:"art",label:"Art & Creative",root:"retail",query:"art creative handmade",sub:["Prints","Original Art","Photography","Posters","Sculptures","Ceramics","Handmade Art","Craft Supplies","Sewing","Knitting","Crochet","Stationery","Digital Downloads"]},
 {id:"kids",label:"Kids & Baby",root:"retail",query:"kids baby products",sub:["Baby Clothes","Kids Clothing","Toys","Nursery","Baby Accessories","Educational Toys","Personalized Kids Gifts","Kids Decor"]},
 {id:"pets",label:"Pets",root:"retail",query:"pet products accessories",sub:["Dog","Cat","Pet Clothing","Collars & Leads","Beds","Toys","Feeding","Pet Accessories","Personalized Pet Gifts"]},
 {id:"kitchen",label:"Food & Kitchen",root:"home",query:"food kitchen drinkware",sub:["Kitchen Tools","Drinkware","Coffee","Tea","Baking","Tableware","Food Storage","Barware","Specialty Food Gifts"]},
 {id:"wellness",label:"Wellness",root:"skin",query:"wellness self care",sub:["Self Care","Massage","Sleep","Meditation","Aromatherapy","Recovery","Wellness Accessories"]},
 {id:"office",label:"Office & Stationery",root:"home",query:"office stationery desk",sub:["Notebooks","Journals","Planners","Pens","Desk Accessories","Office Decor","Laptop Accessories","Personalized Stationery"]},
 {id:"weddings",label:"Weddings & Events",root:"retail",query:"wedding event party",sub:["Wedding Decor","Invitations","Bridal Accessories","Bridesmaid Gifts","Groom Gifts","Party Decor","Favors","Guest Books"]},
 {id:"seasonal",label:"Seasonal",root:"retail",query:"seasonal holiday products",sub:["Christmas","Halloween","Valentine's","Easter","Summer","Autumn","Holiday Decor","Seasonal Gifts"]},
 {id:"vintage",label:"Collectibles & Vintage",root:"retail",query:"vintage collectibles antiques",sub:["Vintage Clothing","Vintage Decor","Memorabilia","Collectibles","Antiques","Retro Tech","Rare Finds"]},
 {id:"discover",label:"Discover",root:"retail",query:"interesting trending products",sub:["Trending","New Arrivals","Handmade","Independent Brands","Personalized","Under €25","Under €50","Premium","Most Unique","YNOT Picks"]}
];

export const ALL_SUBCATEGORIES=[...new Set(SHOP_TAXONOMY.flatMap(category=>category.sub))];
export function taxonomyCategory(id:string){return SHOP_TAXONOMY.find(category=>category.id===id)||SHOP_TAXONOMY[0]}
