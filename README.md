# VibeTube

YouTube uslubidagi React/Vite video platforma demo. Dizayn saqlangan, YouTube Data API v3 orqali real video qidiruvi va tavsiyalar qo‘shilgan.

## Ishga tushirish

1. Terminalda loyiha papkasiga kiring:
   `cd vibetube-react-youtube-style`
2. Paketlarni o‘rnating:
   `npm install`
3. `.env.example` faylini `.env` nomiga o‘zgartiring.
4. `.env` ichiga YouTube Data API v3 kalitingizni yozing:
   `VITE_YOUTUBE_API_KEY=YOUR_REAL_KEY`
5. Ishga tushiring:
   `npm run dev`

## Funksiyalar

- YouTube’dan real mashhur videolarni olish
- YouTube qidiruvi
- Kategoriyalar bo‘yicha qidiruv
- Video thumbnail, kanal, ko‘rishlar, sana va davomiylik
- YouTube embed player
- YouTube’da ochish
- Tomosha tarixi (localStorage)
- Keyinroq ko‘rish ro‘yxati (localStorage)
- Dark/light rejim
- Responsive dizayn
- API xatosida qayta urinish tugmasi

API key frontendda ishlatilgani uchun bu maktab/demo loyihasi uchun mos. Production loyiha uchun API chaqiruvlarini backend orqali qilish va API key uchun HTTP referrer cheklovi qo‘yish tavsiya etiladi.
