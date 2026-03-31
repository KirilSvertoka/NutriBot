import fs from 'fs';
async function test() {
  const res = await fetch('https://world.openfoodfacts.org/api/v2/search?categories_tags_en=chicken&fields=product_name,nutriments');
  const data = await res.json();
  console.log(data.products.map((p: any) => ({
    name: p.product_name,
    energy: p.nutriments?.['energy-kcal_100g'],
    proteins: p.nutriments?.['proteins_100g'],
    fat: p.nutriments?.['fat_100g'],
    carbs: p.nutriments?.['carbohydrates_100g']
  })));
}
test();
