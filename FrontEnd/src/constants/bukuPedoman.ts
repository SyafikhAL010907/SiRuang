export interface PedomanPage {
  id: string;
  number: string;
  title: string;
  page: number;
  description: string;
  steps: string[];
  notes?: string;
  formLink?: string;
}

export const bukuPedoman: PedomanPage[] = [
  {
    id: "step-01",
    number: "01",
    title: "Langkah Umum untuk Seluruh Kendala",
    page: 1,
    description: "Jika laman pendaftaran tidak bisa dimuat, tidak bisa dilanjutkan, dan kendala lainnya. Maka anda bisa melakukan langkah-langkah berikut.",
    steps: [
      "Periksa kembali sinyal atau jaringan internet, pastikan jaringan yang digunakan sedang dalam koneksi yang baik.",
      "Utamakan menggunakan PC/Laptop.",
      "Jika sudah, silahkan dicoba juga menggunakan browser lain seperti Mozilla Firefox atau Microsoft Edge.",
      "Mohon untuk mengakses website di jam yang tidak sibuk, karena semakin banyak yang mengakses website dapat menyebabkan kelambatan kinerja laman pada beberapa pengakses."
    ],
    notes: "JIKA ANDA TERKENDALA UNTUK MENGAKSES LAMAN RESMI PENMABA ATAUPUN LAMAN PENDAFTARAN DIMOHON UNTUK MENGIKUTI PROSEDUR DI ATAS TERLEBIH DAHULU DAN DICOBA SECARA BERKALA TANPA MENGISI FORM APAPUN DIBAWAH INI."
  },
  {
    id: "step-02",
    number: "02",
    title: "Kendala Login Akun",
    page: 2,
    description: "Pastikan anda melakukan proses pendaftaran menggunakan PC/Laptop dengan jaringan internet yang baik. Hindari penggunaan handphone.",
    steps: [
      "Silahkan dipastikan kembali penulisan username dan password anda. Perhatikan pengejaan, tanda spasi, dan huruf kapital pada saat login.",
      "Untuk reset password (bukan reset akun), silahkan isi form berikut https://forms.gle/z1QNFjUcbrGQYWjw6. Pastikan data diisikan dengan sesuai.",
      "Tunggu konfirmasi dari nomor hubung Admisi UNJ melalui WhatsApp atau dicek secara berkala pada akun pendaftaran anda."
    ]
  },
  {
    id: "step-03",
    number: "03",
    title: "Kendala Tidak Bisa Melanjutkan Tahap Pendaftaran",
    page: 3,
    description: "Pastikan anda melakukan proses pendaftaran menggunakan PC/Laptop dengan jaringan internet yang baik. Hindari penggunaan handphone.",
    steps: [
      "Pastikan setiap kolom sudah diisikan sesuai dengan ketentuan.",
      "Jika pada tahap tersebut terdapat kolom untuk unggah file, pastikan format dan ukuran file sudah sesuai dengan yang diminta.",
      "Jika pada tahap tersebut terdapat kolom untuk unggah foto, pastikan format unggahan dan ukuran sudah sesuai, serta klik tombol potong sebelum menyimpan.",
      "Jika terdapat kesalahan pengisian data, anda masih bisa mengubahnya secara mandiri di tahap review. Jika belum sampai ke tahap tersebut, silahkan dilanjutkan saja sampai ke tahap review.",
      "Jika sudah dipastikan setiap kolom diisikan dengan benar dan sudah mencoba dengan device yang berbeda namun belum bisa disimpan, silahkan isi link form berikut dan lampirkan buktinya. https://forms.gle/84NRk87T5DE96DcLA",
      "Tunggu konfirmasi dari nomor hubung Admisi UNJ melalui WhatsApp atau dicek secara berkala pada akun pendaftaran anda."
    ]
  },
  {
    id: "step-04",
    number: "04",
    title: "Kendala Foto Peserta Tidak Terunggah",
    page: 4,
    description: "Pastikan anda melakukan proses pendaftaran menggunakan PC/Laptop dengan jaringan internet yang baik. Hindari penggunaan handphone.",
    steps: [
      "Pastikan pada kolom unggah foto, format unggahan dan ukuran sudah sesuai, serta klik tombol potong sebelum menyimpan.",
      "Jika anda belum sampai ke tahap review, silahkan dilanjutkan terlebih dahulu sampai ke tahap tersebut karena anda masih bisa mengubahnya secara mandiri.",
      "Jika anda menggunakan handphone, silahkan diubah setting tampilan browsernya menjadi tampilan website.",
      "Jika sudah terlanjur sampai ke tahap cetak kartu peserta, silahkan isi link form berikut beserta lampiran foto yang ingin diunggah https://forms.gle/ypvk9punGyxEvZFt7",
      "Tunggu konfirmasi dari nomor hubung Admisi UNJ melalui WhatsApp atau dicek secara berkala pada akun pendaftaran anda."
    ]
  },
  {
    id: "step-05",
    number: "05",
    title: "Kendala Pembayaran",
    page: 5,
    description: "Pastikan anda melakukan proses pendaftaran menggunakan PC/Laptop dengan jaringan internet yang baik. Hindari penggunaan handphone.",
    steps: [
      "Pembayaran hanya bisa dilakukan melalui mitra bank UNJ, yaitu Bank BNI, Mandiri, BTN, DKI dan bukan dari Bank atau platform e-wallet lainnya.",
      "Pastikan tenggat pembayaran pada slip tagihan masih belum expired. Jika sudah expired dan anda belum membayarkan sampai dengan saat ini, silahkan di cek terlebih dahulu melalui M-Banking apakah tagihan tersebut masih bisa dibayarkan atau tidak.",
      "Jika sudah terlewat dan tidak bisa dibayarkan, silahkan membuat akun baru dengan mengisi form berikut https://forms.gle/bb5P9e6hP6jvNN336. Khusus untuk jenjang Pascasarjana, tidak perlu membuat akun baru namun tetap mengisi form di atas.",
      "Jika sudah membayarkan namun masih belum bisa lanjut ke tahap selanjutnya, mohon ditunggu sampai 3x24 jam. Setelah pembayaran, mohon untuk logout terlebih dahulu dan login kembali atau dicoba menggunakan device lain, utamakan penggunaan PC/laptop.",
      "Jika langkah-langkah di atas sudah dilakukan namun masih terkendala, silahkan mengisi form berikut https://forms.gle/bb5P9e6hP6jvNN336",
      "Tunggu konfirmasi dari nomor hubung Admisi UNJ melalui WhatsApp atau dicek secara berkala pada akun pendaftaran anda."
    ]
  }
];
