import { Machine, CD5Project, TimeBreakPartItem } from '../types';

export const PRELOADED_MACHINES: Machine[] = [
  {id:"RIM01", name:"RICE MIXER", lineGroup:"LINE X", model:"RM-500X", powerVoltage:"380V 3P 7.5kW", installDate:"2023-03-15", vendor:"Kanto Machinery Co., Ltd.", locationZone:"โซนเตรียมข้าว", locationRoom:"ห้องผสมข้าว 1 (Rice Mixing 1)", serialNumber:"RM-2023-011", notes:"ตรวจวัดระดับน้ำมันหล่อลื่นเกียร์ทุกเดือน"}, 
  {id:"RIM02", name:"RICE MIXER", lineGroup:"LINE X", model:"RM-500X", powerVoltage:"380V 3P 7.5kW", installDate:"2023-03-15", vendor:"Kanto Machinery Co., Ltd.", locationZone:"โซนเตรียมข้าว", locationRoom:"ห้องผสมข้าว 2 (Rice Mixing 2)", serialNumber:"RM-2023-012", notes:"ตรวจสอบสปีดและโซ่ขับเคลื่อน"},
  {id:"TOC01", name:"RICE TAKE-OUT CONVEYOR", lineGroup:"LINE X", model:"TOC-200", powerVoltage:"220V 1P 1.5kW", installDate:"2023-04-10", vendor:"Thai Conveyor Tech", locationZone:"โซนเตรียมข้าว", locationRoom:"ห้องผสมข้าว 1", serialNumber:"TOC-9901", notes:"สายพานลำเลียงฟู้ดเกรด"}, 
  {id:"TOC02", name:"RICE TAKE-OUT CONVEYOR", lineGroup:"LINE X", model:"TOC-200", powerVoltage:"220V 1P 1.5kW", installDate:"2023-04-10", vendor:"Thai Conveyor Tech", locationZone:"โซนเตรียมข้าว", locationRoom:"ห้องผสมข้าว 2", serialNumber:"TOC-9902", notes:"สายพานลำเลียงฟู้ดเกรด"},
  {id:"VAC01", name:"VACUUM COOLER", lineGroup:"VACUUM", model:"VC-120-Pro", powerVoltage:"380V 3P 15kW", installDate:"2023-06-20", vendor:"CoolTech System Co., Ltd.", locationZone:"โซนทำให้เย็น", locationRoom:"ห้องสุญญากาศลดอุณหภูมิ A", serialNumber:"VC-2023-01", notes:"ล้างทำความสะอาดคอนเดนเซอร์ประจำสัปดาห์"}, 
  {id:"VAC02", name:"VACUUM COOLER", lineGroup:"VACUUM", model:"VC-120-Pro", powerVoltage:"380V 3P 15kW", installDate:"2023-06-20", vendor:"CoolTech System Co., Ltd.", locationZone:"โซนทำให้เย็น", locationRoom:"ห้องสุญญากาศลดอุณหภูมิ B", serialNumber:"VC-2023-02", notes:"ตรวจระดับน้ำมันปั๊มสุญญากาศ"},
  {id:"VAC03", name:"VACUUM COOLER", lineGroup:"VACUUM", model:"VC-120-Pro", powerVoltage:"380V 3P 15kW", installDate:"2023-07-05", vendor:"CoolTech System Co., Ltd.", locationZone:"โซนทำให้เย็น", locationRoom:"ห้องสุญญากาศลดอุณหภูมิ C", serialNumber:"VC-2023-03", notes:"ตรวจเช็ควาล์วเปิด-ปิด"}, 
  {id:"VAC04", name:"VACUUM COOLER", lineGroup:"VACUUM", model:"VC-120-Pro", powerVoltage:"380V 3P 15kW", installDate:"2023-07-05", vendor:"CoolTech System Co., Ltd.", locationZone:"โซนทำให้เย็น", locationRoom:"ห้องสุญญากาศลดอุณหภูมิ D", serialNumber:"VC-2023-04", notes:"ตรวจเช็คระบบระบายความร้อน"},
  {id:"VAC05", name:"VACUUM COOLER", lineGroup:"VACUUM", model:"VC-150-Max", powerVoltage:"380V 3P 18.5kW", installDate:"2024-01-12", vendor:"CoolTech System Co., Ltd.", locationZone:"โซนทำให้เย็น", locationRoom:"ห้องสุญญากาศลดอุณหภูมิ E", serialNumber:"VC-2024-05", notes:"รุ่นกำลังสูง รองรับรอบการผลิตเร่งด่วน"}, 
  {id:"VAC06", name:"VACUUM COOLER", lineGroup:"VACUUM", model:"VC-150-Max", powerVoltage:"380V 3P 18.5kW", installDate:"2024-01-12", vendor:"CoolTech System Co., Ltd.", locationZone:"โซนทำให้เย็น", locationRoom:"ห้องสุญญากาศลดอุณหภูมิ F", serialNumber:"VC-2024-06", notes:"รุ่นกำลังสูง"},
  {id:"FFS01", name:"HORIZONTAL FORM FILL SEAL", lineGroup:"PACKING", model:"HFFS-3000", powerVoltage:"220V 1P 3.5kW", installDate:"2024-02-01", vendor:"PackMaster International", locationZone:"โซนบรรจุภัณฑ์", locationRoom:"ห้องบรรจุปลอดเชื้อ (Clean Room 1)", serialNumber:"HFFS-2024-881", notes:"ตรวจสอบฮีตเตอร์ซีลปากถุง 180°C"}, 
  {id:"FFS02", name:"HORIZONTAL FORM FILL SEAL", lineGroup:"PACKING", model:"HFFS-3000", powerVoltage:"220V 1P 3.5kW", installDate:"2024-02-01", vendor:"PackMaster International", locationZone:"โซนบรรจุภัณฑ์", locationRoom:"ห้องบรรจุปลอดเชื้อ (Clean Room 2)", serialNumber:"HFFS-2024-882", notes:"ตรวจเช็คความตึงฟิล์มบรรจุ"},
  {id:"FFS03", name:"HORIZONTAL FORM FILL SEAL", lineGroup:"PACKING", model:"HFFS-3200", powerVoltage:"220V 1P 4.0kW", installDate:"2024-05-18", vendor:"PackMaster International", locationZone:"โซนบรรจุภัณฑ์", locationRoom:"ห้องบรรจุปลอดเชื้อ (Clean Room 3)", serialNumber:"HFFS-2024-883", notes:"ชุดซีลความเร็วสูง"},
  {id:"ATS01", name:"AUTOMATIC TOP SEALER", lineGroup:"SEALER", model:"ATS-80", powerVoltage:"220V 1P 2.8kW", installDate:"2023-08-15", vendor:"TopSeal Machine Asia", locationZone:"โซนปิดผนึก", locationRoom:"ห้องบรรจุกล่องอาหาร 1", serialNumber:"ATS-80-01", notes:"ใบมีดตัดฟิล์มต้องคมสม่ำเสมอ"}, 
  {id:"ATS02", name:"AUTOMATIC TOP SEALER", lineGroup:"SEALER", model:"ATS-80", powerVoltage:"220V 1P 2.8kW", installDate:"2023-08-15", vendor:"TopSeal Machine Asia", locationZone:"โซนปิดผนึก", locationRoom:"ห้องบรรจุกล่องอาหาร 2", serialNumber:"ATS-80-02", notes:"ตรวจสอบระบบสุญญากาศและก๊าซ"},
  {id:"ATS03", name:"TOP SEALER ยำสาหร่าย", lineGroup:"SEALER", model:"ATS-60S", powerVoltage:"220V 1P 2.2kW", installDate:"2023-09-01", vendor:"TopSeal Machine Asia", locationZone:"โซนปิดผนึก", locationRoom:"ห้องบรรจุยำสาหร่าย", serialNumber:"ATS-60S-03", notes:"ตั้งค่าความร้อนซีลถ้วยยำสาหร่าย"}, 
  {id:"ATS04", name:"TOP SEALER ข้าวเหนียว", lineGroup:"SEALER", model:"ATS-60S", powerVoltage:"220V 1P 2.2kW", installDate:"2023-09-01", vendor:"TopSeal Machine Asia", locationZone:"โซนปิดผนึก", locationRoom:"ห้องบรรจุข้าวเหนียว", serialNumber:"ATS-60S-04", notes:"ตั้งค่าแรงกดแม่พิมพ์ข้าวเหนียว"},
  {id:"ATS05", name:"TOP SEALER CUP TO GO", lineGroup:"SEALER", model:"ATS-90C", powerVoltage:"220V 1P 3.0kW", installDate:"2024-02-20", vendor:"TopSeal Machine Asia", locationZone:"โซนปิดผนึก", locationRoom:"ห้องบรรจุ Cup To Go", serialNumber:"ATS-90C-05", notes:"โมลด์ทรงถ้วยสูง"}, 
  {id:"ATS06", name:"TOP SEALER สลัด", lineGroup:"SEALER", model:"ATS-90S", powerVoltage:"220V 1P 3.0kW", installDate:"2024-02-20", vendor:"TopSeal Machine Asia", locationZone:"โซนปิดผนึก", locationRoom:"ห้องบรรจุสลัด", serialNumber:"ATS-90S-06", notes:"โมลด์ถ้วยสลัด"},
  {id:"MTD01", name:"METAL DETECTOR", lineGroup:"INSPECTION", model:"MD-500F", powerVoltage:"220V 1P 0.8kW", installDate:"2023-01-10", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์ 1", serialNumber:"MD-ANR-01", notes:"ทดสอบ Test Piece Fe/Non-Fe/SUS ทุกชั่วโมง"}, 
  {id:"MTD02", name:"METAL DETECTOR", lineGroup:"INSPECTION", model:"MD-500F", powerVoltage:"220V 1P 0.8kW", installDate:"2023-01-10", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์ 2", serialNumber:"MD-ANR-02", notes:"ทดสอบ Test Piece Fe/Non-Fe/SUS ทุกชั่วโมง"}, 
  {id:"MTD03", name:"METAL DETECTOR", lineGroup:"INSPECTION", model:"MD-500F", powerVoltage:"220V 1P 0.8kW", installDate:"2023-01-10", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์ 3", serialNumber:"MD-ANR-03", notes:"ทดสอบ Test Piece Fe/Non-Fe/SUS ทุกชั่วโมง"}, 
  {id:"MTD04", name:"METAL DETECTOR", lineGroup:"INSPECTION", model:"MD-500F", powerVoltage:"220V 1P 0.8kW", installDate:"2023-01-10", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์ 4", serialNumber:"MD-ANR-04", notes:"ทดสอบ Test Piece Fe/Non-Fe/SUS ทุกชั่วโมง"}, 
  {id:"MTD05", name:"METAL DETECTOR", lineGroup:"INSPECTION", model:"MD-500F", powerVoltage:"220V 1P 0.8kW", installDate:"2023-01-10", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์ 5", serialNumber:"MD-ANR-05", notes:"ทดสอบ Test Piece Fe/Non-Fe/SUS ทุกชั่วโมง"}, 
  {id:"MTD06", name:"METAL DETECTOR", lineGroup:"INSPECTION", model:"MD-500F", powerVoltage:"220V 1P 0.8kW", installDate:"2023-01-10", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์ 6", serialNumber:"MD-ANR-06", notes:"ทดสอบ Test Piece Fe/Non-Fe/SUS ทุกชั่วโมง"}, 
  {id:"MTD07", name:"METAL DETECTOR berger", lineGroup:"INSPECTION", model:"MD-600B", powerVoltage:"220V 1P 1.0kW", installDate:"2023-05-12", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์เบอร์เกอร์", serialNumber:"MD-ANR-07B", notes:"ทดสอบ Test Piece Fe 1.2, Non-Fe 1.5, SUS 2.0"}, 
  {id:"MTD08", name:"METAL DETECTOR", lineGroup:"INSPECTION", model:"MD-500F", powerVoltage:"220V 1P 0.8kW", installDate:"2023-01-10", vendor:"Anritsu Industrial Solutions", locationZone:"โซนตรวจสอบคุณภาพ", locationRoom:"ห้องตรวจจับโลหะไลน์ 8", serialNumber:"MD-ANR-08", notes:"ทดสอบ Test Piece Fe/Non-Fe/SUS ทุกชั่วโมง"}, 
  {id:"XRA01", name:"X-RAY INSPECTION SYSTEM", lineGroup:"INSPECTION", model:"XR-900HD", powerVoltage:"220V 1P 1.2kW", installDate:"2023-02-15", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์ 1", serialNumber:"XR-ISH-01", notes:"ตรวจสิ่งปลอมปนกระดูกและโลหะความแม่นยำสูง"}, 
  {id:"XRA02", name:"X-RAY INSPECTION SYSTEM", lineGroup:"INSPECTION", model:"XR-900HD", powerVoltage:"220V 1P 1.2kW", installDate:"2023-02-15", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์ 2", serialNumber:"XR-ISH-02", notes:"ตรวจสิ่งปลอมปนกระดูกและโลหะ"}, 
  {id:"XRA03", name:"X-RAY INSPECTION SYSTEM", lineGroup:"INSPECTION", model:"XR-900HD", powerVoltage:"220V 1P 1.2kW", installDate:"2023-02-15", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์ 3", serialNumber:"XR-ISH-03", notes:"ตรวจสิ่งปลอมปนกระดูกและโลหะ"}, 
  {id:"XRA04", name:"X-RAY INSPECTION SYSTEM", lineGroup:"INSPECTION", model:"XR-900HD", powerVoltage:"220V 1P 1.2kW", installDate:"2023-02-15", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์ 4", serialNumber:"XR-ISH-04", notes:"ตรวจสิ่งปลอมปนกระดูกและโลหะ"}, 
  {id:"XRA05", name:"X-RAY INSPECTION SYSTEM", lineGroup:"INSPECTION", model:"XR-900HD", powerVoltage:"220V 1P 1.2kW", installDate:"2023-02-15", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์ 5", serialNumber:"XR-ISH-05", notes:"ตรวจสิ่งปลอมปนกระดูกและโลหะ"}, 
  {id:"XRA06", name:"X-RAY INSPECTION SYSTEM", lineGroup:"INSPECTION", model:"XR-900HD", powerVoltage:"220V 1P 1.2kW", installDate:"2023-02-15", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์ 6", serialNumber:"XR-ISH-06", notes:"ตรวจสิ่งปลอมปนกระดูกและโลหะ"}, 
  {id:"XRA07", name:"X-RAY INSPECTION SYSTEM berger", lineGroup:"INSPECTION", model:"XR-950BG", powerVoltage:"220V 1P 1.5kW", installDate:"2023-05-18", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์เบอร์เกอร์", serialNumber:"XR-ISH-07BG", notes:"ตรวจความหนาแน่นชิ้นเนื้อและสิ่งแปลกปลอม"}, 
  {id:"XRA08", name:"X-RAY INSPECTION SYSTEM", lineGroup:"INSPECTION", model:"XR-900HD", powerVoltage:"220V 1P 1.2kW", installDate:"2023-02-15", vendor:"Ishida Co., Ltd.", locationZone:"โซนตรวจสอบสิ่งแปลกปลอม", locationRoom:"ห้องเอ็กซเรย์อาหารไลน์ 8", serialNumber:"XR-ISH-08", notes:"ตรวจสิ่งปลอมปนกระดูกและโลหะ"}, 
  {id:"RFD01", name:"RICE FEEDER", lineGroup:"RICE FEED", model:"RF-100", powerVoltage:"380V 3P 3.0kW", installDate:"2023-03-01", vendor:"Thai Food Engineering", locationZone:"โซนป้อนข้าว", locationRoom:"ห้องป้อนข้าวเข้าสู่สายพาน", serialNumber:"RF-2023-01", notes:"ตรวจการไหลของเมล็ดข้าว"}, 
  {id:"RFD02", name:"RICE FEEDER", lineGroup:"RICE FEED", model:"RF-100", powerVoltage:"380V 3P 3.0kW", installDate:"2023-03-01", vendor:"Thai Food Engineering", locationZone:"โซนป้อนข้าว", locationRoom:"ห้องป้อนข้าวเข้าสู่สายพาน", serialNumber:"RF-2023-02", notes:"ตรวจการไหลของเมล็ดข้าว"}, 
  {id:"RFD03", name:"RICE FEEDER", lineGroup:"RICE FEED", model:"RF-100", powerVoltage:"380V 3P 3.0kW", installDate:"2023-03-01", vendor:"Thai Food Engineering", locationZone:"โซนป้อนข้าว", locationRoom:"ห้องป้อนข้าวเข้าสู่สายพาน", serialNumber:"RF-2023-03", notes:"ตรวจการไหลของเมล็ดข้าว"}, 
  {id:"BAN01", name:"BANDING", lineGroup:"PACKING", model:"BD-50", powerVoltage:"220V 1P 0.75kW", installDate:"2023-04-20", vendor:"BandMaster Japan", locationZone:"โซนรัดกล่อง", locationRoom:"ห้องมัดสายรัดบรรจุภัณฑ์ 1", serialNumber:"BD-2023-01", notes:"ปรับแรงดึงสายรัดตามสเปกกล่อง"}, 
  {id:"BAN02", name:"BANDING", lineGroup:"PACKING", model:"BD-50", powerVoltage:"220V 1P 0.75kW", installDate:"2023-04-20", vendor:"BandMaster Japan", locationZone:"โซนรัดกล่อง", locationRoom:"ห้องมัดสายรัดบรรจุภัณฑ์ 2", serialNumber:"BD-2023-02", notes:"ปรับแรงดึงสายรัดตามสเปกกล่อง"}, 
  {id:"BAN03", name:"BANDING", lineGroup:"PACKING", model:"BD-50", powerVoltage:"220V 1P 0.75kW", installDate:"2023-04-20", vendor:"BandMaster Japan", locationZone:"โซนรัดกล่อง", locationRoom:"ห้องมัดสายรัดบรรจุภัณฑ์ 3", serialNumber:"BD-2023-03", notes:"ปรับแรงดึงสายรัดตามสเปกกล่อง"}, 
  {id:"BAN04", name:"BANDING", lineGroup:"PACKING", model:"BD-50", powerVoltage:"220V 1P 0.75kW", installDate:"2023-04-20", vendor:"BandMaster Japan", locationZone:"โซนรัดกล่อง", locationRoom:"ห้องมัดสายรัดบรรจุภัณฑ์ 4", serialNumber:"BD-2023-04", notes:"ปรับแรงดึงสายรัดตามสเปกกล่อง"}, 
  {id:"BAN05", name:"BANDING", lineGroup:"PACKING", model:"BD-50", powerVoltage:"220V 1P 0.75kW", installDate:"2023-04-20", vendor:"BandMaster Japan", locationZone:"โซนรัดกล่อง", locationRoom:"ห้องมัดสายรัดบรรจุภัณฑ์ 5", serialNumber:"BD-2023-05", notes:"ปรับแรงดึงสายรัดตามสเปกกล่อง"}, 
  {id:"BAN06", name:"BANDING", lineGroup:"PACKING", model:"BD-50", powerVoltage:"220V 1P 0.75kW", installDate:"2023-04-20", vendor:"BandMaster Japan", locationZone:"โซนรัดกล่อง", locationRoom:"ห้องมัดสายรัดบรรจุภัณฑ์ 6", serialNumber:"BD-2023-06", notes:"ปรับแรงดึงสายรัดตามสเปกกล่อง"},
  {id:"BCF01", name:"BLAST CHILLER & FREEZER", lineGroup:"FREEZER"}, 
  {id:"BCF02", name:"BLAST CHILLER & FREEZER", lineGroup:"FREEZER"},
  {id:"BCF03", name:"BLAST CHILLER & FREEZER", lineGroup:"FREEZER"}, 
  {id:"BCF04", name:"BLAST CHILLER & FREEZER", lineGroup:"FREEZER"},
  {id:"BCF05", name:"BLAST CHILLER & FREEZER", lineGroup:"FREEZER"}, 
  {id:"BCF06", name:"BLAST CHILLER & FREEZER", lineGroup:"FREEZER"},
  {id:"BCH01", name:"BLAST CHILLER", lineGroup:"FREEZER"},
  {id:"CDU01", name:"CONDENSING UNIT", lineGroup:"UTILITY"}, 
  {id:"CDU02", name:"CONDENSING UNIT", lineGroup:"UTILITY"},
  {id:"CDU03", name:"CONDENSING UNIT", lineGroup:"UTILITY"}, 
  {id:"CDU04", name:"CONDENSING UNIT", lineGroup:"UTILITY"},
  {id:"CDU05", name:"CONDENSING UNIT", lineGroup:"UTILITY"}, 
  {id:"CDU06", name:"CONDENSING UNIT", lineGroup:"UTILITY"},
  {id:"TLP01", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"}, 
  {id:"TLP02", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"TLP03", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"}, 
  {id:"TLP04", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"TLP05", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"}, 
  {id:"TLP06", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"TLP07", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"}, 
  {id:"TLP08", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"TLP09", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"}, 
  {id:"TLP10", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"TLP11", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"}, 
  {id:"TLP12", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"TLP13", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"}, 
  {id:"TLP14", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"TLP15", name:"THERMAL LABEL PRINTER", lineGroup:"PRINTER"},
  {id:"INK01", name:"INK JET", lineGroup:"PRINTER"}, 
  {id:"INK02", name:"INK JET", lineGroup:"PRINTER"},
  {id:"INK03", name:"INK JET", lineGroup:"PRINTER"}, 
  {id:"INK04", name:"INK JET", lineGroup:"PRINTER"},
  {id:"STK01", name:"เครื่องติดสติกเกอร์อัตโนมัติ", lineGroup:"STICKER"}, 
  {id:"STK02", name:"เครื่องติดสติกเกอร์อัตโนมัติ", lineGroup:"STICKER"},
  {id:"STK03", name:"เครื่องติดสติกเกอร์อัตโนมัติ", lineGroup:"STICKER"}, 
  {id:"STK04", name:"เครื่องติดสติกเกอร์อัตโนมัติ ซูซิโรล", lineGroup:"STICKER"},
  {id:"STK05", name:"เครื่องติดสติกเกอร์อัตโนมัติ โอนิกิริ", lineGroup:"STICKER"}, 
  {id:"STK06", name:"เครื่องติดสติกเกอร์อัตโนมัติ โอนิกิริ แบบใหม่", lineGroup:"STICKER"},
  {id:"STK07", name:"เครื่องติดสติกเกอร์อัตโนมัติ", lineGroup:"STICKER"},
  {id:"OFR01", name:"ONIGIRI FORMING ROBOT", lineGroup:"ROBOT"}, 
  {id:"ONR01", name:"Onigiri Robot", lineGroup:"ROBOT"},
  {id:"ORS01", name:"Onigiri Robot (Supply unit)", lineGroup:"ROBOT"}, 
  {id:"ARB01", name:"Automatic Rice Ball Wrapping Machine", lineGroup:"ROBOT"},
  {id:"WPM01", name:"WRAPPING MACHINE (โอนิกิริ)", lineGroup:"PACKING"},
  {id:"FOM01", name:"FORMING", lineGroup:"ROBOT"}, 
  {id:"SRM01", name:"STICKY RICE FORMING MACHINE", lineGroup:"ROBOT"},
  {id:"GKT01", name:"เครื่องขึ้นรูปเบอร์เกอร์ข้าวเหนียว 2", lineGroup:"ROBOT"},
  {id:"MIV01", name:"MIXER VERTICAL", lineGroup:"MIXER"}, 
  {id:"MIV02", name:"MIXER VERTICAL", lineGroup:"MIXER"}, 
  {id:"MIV03", name:"MIXER VERTICAL", lineGroup:"MIXER"},
  {id:"MIX01", name:"เครื่องคลุกข้าว", lineGroup:"MIXER"},
  {id:"UFL01", name:"UNIFILLER", lineGroup:"FILLER"}, 
  {id:"UFL02", name:"UNIFILLER", lineGroup:"FILLER"},
  {id:"RJT01", name:"REJECTOR", lineGroup:"REJECTOR"}, 
  {id:"RJT02", name:"REJECTOR", lineGroup:"REJECTOR"}, 
  {id:"RJT03", name:"REJECTOR", lineGroup:"REJECTOR"},
  {id:"RJT04", name:"REJECTOR", lineGroup:"REJECTOR"}, 
  {id:"RJT05", name:"REJECTOR", lineGroup:"REJECTOR"}, 
  {id:"RJT06", name:"REJECTOR", lineGroup:"REJECTOR"},
  {id:"RJT07", name:"REJECTOR berger", lineGroup:"REJECTOR"}, 
  {id:"RJT08", name:"REJECTOR", lineGroup:"REJECTOR"},
  {id:"STN01", name:"SHRINK TUNNEL", lineGroup:"UTILITY"}, 
  {id:"STN02", name:"SHRINK TUNNEL", lineGroup:"UTILITY"},
  {id:"PAC01", name:"PACKING MACHINE", lineGroup:"PACKING"}, 
  {id:"PAC02", name:"PACKING MACHINE", lineGroup:"PACKING"},
  {id:"LSE01", name:"L SEAL", lineGroup:"PACKING"}, 
  {id:"CLM01", name:"เครื่องปิดฝาข้าวถ้วย", lineGroup:"PACKING"},
  {id:"SEH01", name:"เครื่องชีลแนวนอน", lineGroup:"PACKING"}, 
  {id:"CUC01", name:"CUTTING CONVEYOR", lineGroup:"CONVEYOR"},
  {id:"RST01", name:"ROLL SUSHI TRANSFER MACHINE", lineGroup:"ROBOT"}, 
  {id:"RSW01", name:"ROLL SUSHI WRAPPING MACHINE", lineGroup:"ROBOT"},
  {id:"CUF01", name:"เครื่องตัดแคริฟอเนีย โรล", lineGroup:"ROBOT"},
  {id:"RPT01", name:"RICE PORTION", lineGroup:"ROBOT"}, 
  {id:"RPT02", name:"RICE PORTION", lineGroup:"ROBOT"},
  {id:"WDV01", name:"Weighing Device", lineGroup:"QC"}, 
  {id:"WDR01", name:"Weighing Device (Reject)", lineGroup:"QC"},
  {id:"TTB01", name:"Turn Table", lineGroup:"CONVEYOR"}, 
  {id:"TTB02", name:"Turn Table", lineGroup:"CONVEYOR"}, 
  {id:"TTB03", name:"Turn Table", lineGroup:"CONVEYOR"},
  {id:"TTB04", name:"Turn Table", lineGroup:"CONVEYOR"}, 
  {id:"TTB05", name:"Turn Table", lineGroup:"CONVEYOR"},
  {id:"FDJ01", name:"เครื่องซักรองเท้า", lineGroup:"UTILITY"},
  {id:"FMC01", name:"FORMING CONVEYOR", lineGroup:"CONVEYOR"}, 
  {id:"FMC02", name:"FORMING CONVEYOR", lineGroup:"CONVEYOR"},
  {id:"SLI01", name:"เครื่องหั่นผัก (Food Slicer)", lineGroup:"CUTTER", model:"FS-3000", powerVoltage:"200-240V 3Phase", installDate:"2024-01-10", vendor:"Food Slicer Industry", locationZone:"โซนเตรียมวัตถุดิบ", locationRoom:"ห้องหั่นผักและสไลซ์", serialNumber:"SLI-2024-01", notes:"มอเตอร์ขับสายพาน 0.2kW, มอเตอร์ขับใบมีด 1.75kW"},
];

export const PRELOADED_TECHNICIANS: string[] = [
  "ช่าง 1","ช่าง 2","ช่าง 3","ช่าง 4","ช่าง 5",
  "ช่าง 6","ช่าง 7","ช่าง 8","ช่าง 9","ช่าง 10",
  "ช่าง 11","ช่าง 12","ช่าง 13","ช่าง 14","ช่าง 15",
  "ช่าง 16","ช่าง 17","ช่าง 18","ช่าง 19","ช่าง 20"
];

// Some sample mock data to make first-time loading feel fully-featured and live instantly
export const PRELOADED_PM_PLANS = [
  {
    id: "plan-pm-01",
    machineId: "RIM01",
    title: "ตรวจสภาพและทำความสะอาด Rice Mixer ประจำสัปดาห์",
    frequency: "รายสัปดาห์",
    steps: [
      { title: "ตรวจสอบใบกวนและจุดยึด", stdTime: 15 },
      { title: "ทำความสะอาดหัวฉีดน้ำส้มสายชู", stdTime: 10 },
      { title: "ตรวจสอบระบบขับเคลื่อนและเฟืองเกียร์", stdTime: 20 }
    ],
    spareParts: "น้ำมันหล่อลื่นเกรดอาหาร NSF-H1",
    ttm: 45
  },
  {
    id: "plan-pm-02",
    machineId: "VAC01",
    title: "ตรวจสอบระบบสุญญากาศและซีลยางประตู",
    frequency: "รายเดือน",
    steps: [
      { title: "ตรวจวัดประสิทธิภาพปั๊มสุญญากาศ", stdTime: 30 },
      { title: "ตรวจสอบความตึงและการล้าของซีลยาง", stdTime: 15 },
      { title: "ตรวจเช็ควาล์วควบคุมแรงดันลม", stdTime: 15 }
    ],
    spareParts: "ซีลยางขอบประตู VAC01, น้ำมันแวคคั่มปั๊ม",
    ttm: 60
  },
  {
    id: "plan-pm-03",
    machineId: "FFS01",
    title: "ตรวจเช็คชุดฮีตเตอร์และใบมีดตัดซองสไลด์",
    frequency: "รายสัปดาห์",
    steps: [
      { title: "ตรวจสอบอุณหภูมิฮีตเตอร์และสายไฟ", stdTime: 15 },
      { title: "ทดลองความคมของใบมีดตัดสไลด์", stdTime: 15 }
    ],
    spareParts: "ใบมีดเตเปอร์คัตเตอร์, ลวดความร้อนสำรอง",
    ttm: 30
  }
];

export const PRELOADED_REPAIRS = [
  {
    id: "rep-01",
    type: "Repair",
    technician: "ช่าง 1",
    date: "2026-06-08",
    machineId: "FFS02",
    breakdownTime: "2026-06-08T09:15",
    repairDoneTime: "2026-06-08T10:45",
    symptoms: "เครื่องซีลแนวนอนไม่ร้อน ซีลปากถุงไม่ได้",
    why1: "หัวฮีตเตอร์ไม่ร้อนและอุณหภูมิหน้าจอตกต่อเนื่อง",
    why2: "ไม่มีกระแสไฟฟ้าไหลผ่านขดลวดฮีตเตอร์ตัวนำความร้อน",
    why3: "ตรวจพบว่าสายไฟด้านล่างหลวมจากแรงสั่นสะเทือนเครื่องจักร",
    why4: "สายไม่ได้ยึดเข้ากับสายเกลียวเก็บสายและแคลมป์ยึดแน่นพอ",
    why5: "ไม่มีการตรวจสอบความแน่นของขั้วสายไฟในแผน PM ประจำเครื่อง",
    correctiveAction: "เข้าสายไฟใหม่ ยึดแคลมป์ท่อหดแรงสั่นสะเทือน และเพิ่มจุดตรวจสอบขั้วไฟฟ้าลงในแผน PM ประจำสัปดาห์",
    duration: 90
  },
  {
    id: "rep-02",
    type: "Repair",
    technician: "ช่าง 2",
    date: "2026-06-09",
    machineId: "VAC02",
    breakdownTime: "2026-06-09T14:00",
    repairDoneTime: "2026-06-09T16:15",
    symptoms: "แวคคั่มห้องเย็นไม่ลดแรงดันอุณหภูมิสูงเกินขีดจำกัด",
    why1: "ปั๊มทำลมช้าผิดรูป",
    why2: "โซลินอยด์วาล์วเสียขดลวดละลาย",
    why3: "ไฟกระชากเกิดความร้อนสะสมที่คอยล์ควบคุม",
    why4: "พัดลมระบายความร้อนตู้ควบคุมด้านบนฝุ่นจับหนาแน่นจนหยุดทำงาน",
    why5: "ไม่ได้ทำความสะอาดตู้คอโทรลมากกว่า 3 เดือนเนื่องจากการซ่อมบำรุงเน้นเครื่องจักรเป็นหลัก",
    correctiveAction: "เปลี่ยนโซลินอยด์วาล์วใหม่ ทำความสะอาดฝุ่นตู้คอนโทรล และเปลี่ยนพัดลมระบายความร้อนตัวใหม่",
    duration: 135 // > 120 minutes breakdown! Red warning!
  }
];

export const PRELOADED_IMPROVEMENTS = [
  {
    id: "imp-00",
    type: "Improvement",
    title: "ออกแบบการ์ดป้องกันเศษแป้งและชุดทำความสะอาดลูกรีดอัตโนมัติ",
    description: "ปรับปรุงโครงสร้างฝาครอบเครื่อง FFS03 โดยติดตั้งแผ่นอะคริลิกใสทนความร้อนพร้อมชุดเป่าลมสะอาด ลดการสะสมของคราบวัตถุดิบและย่นเวลาล้างทำความสะอาดก่อนกะผลิต",
    machineId: "FFS03",
    startDate: "2026-06-01",
    plannedEndDate: "2026-06-07",
    workLogs: [
      { id: "wl-01", date: "2026-06-02", hours: 2, note: "สำรวจจุดสะสมเศษแป้งแปรรูปและออกแบบแบบจำลองการ์ดป้องกัน" },
      { id: "wl-02", date: "2026-06-05", hours: 2, note: "ประกอบติดตั้งการ์ดอะคริลิกและทดสอบเปิดระบบลมเป่าหน้างานจริง" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 1",
    technicians: ["ช่าง 1", "ช่าง 2"],
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8' rx='16'/><path d='M150 250 L250 150 L350 220 L450 120' stroke='%23ef4444' stroke-width='6' fill='none'/><circle cx='450' cy='120' r='12' fill='%23ef4444'/><text x='300' y='90' text-anchor='middle' fill='%23f59e0b' font-size='22' font-family='sans-serif' font-weight='bold'>BEFORE [ก่อนปรับปรุง]</text><text x='300' y='290' text-anchor='middle' fill='%2394a3b8' font-size='15' font-family='sans-serif'>พบเศษวัตถุดิบสะสม / กลไกเดิมยังไม่มีชุดการ์ดป้องกัน</text><rect x='160' y='320' width='280' height='30' rx='6' fill='%23ef4444' opacity='0.3'/><text x='300' y='340' text-anchor='middle' fill='%23fca5a5' font-size='12' font-family='sans-serif' font-weight='bold'>⚠️ เสียเวลาทำความสะอาด 35 นาที/วัน</text></svg>",
    photoAfter: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23064e3b'/><rect x='40' y='40' width='520' height='320' fill='%23022c22' stroke='%2310b981' stroke-width='4' rx='16'/><path d='M150 220 L250 220 L350 220 L450 220' stroke='%2310b981' stroke-width='8' stroke-linecap='round'/><circle cx='450' cy='220' r='14' fill='%2334d399'/><text x='300' y='90' text-anchor='middle' fill='%2334d399' font-size='22' font-family='sans-serif' font-weight='bold'>AFTER [หลังปรับปรุง Kaizen]</text><text x='300' y='280' text-anchor='middle' fill='%23a7f3d0' font-size='15' font-family='sans-serif'>ติดตั้งชุด Teflon Guard & Air Jet ปลดชิ้นงานอัตโนมัติ</text><rect x='160' y='320' width='280' height='30' rx='6' fill='%23059669'/><text x='300' y='340' text-anchor='middle' fill='%23ffffff' font-size='12' font-family='sans-serif' font-weight='bold'>✓ ย่นเวลาทำความสะอาดเหลือเพียง 5 นาที</text></svg>"
  },
  {
    id: "imp-01",
    type: "Improvement",
    title: "ออกแบบกลไกรีดแผ่นข้าวซูชิตายตัวป้องกันข้าวติด",
    description: "ปรับปรุงลูกรีดและเพิ่มเทมเพลตปัดน้ำมันอัจฉริยะช่วยลดอัตราสูญเสียของแป้งข้าวและย่นระยะเวลาทำความสะอาดระหว่างกะผลิต",
    machineId: "RST01",
    startDate: "2026-06-05",
    plannedEndDate: "2026-06-15",
    workLogs: [
      { id: "wl-1", date: "2026-06-06", hours: 2, note: "หารือแบบร่วมกับทีมซ่อมบำรุงและฝ่ายผลิตโรงงาน" },
      { id: "wl-2", date: "2026-06-08", hours: 4, note: "ขึ้นรูปกลไกรองรับและทดลองติดตั้งลูกรีดเคลือบเทฟลอน" }
    ],
    status: "กำลังดำเนินการ",
    technician: "ช่าง 3",
    technicians: ["ช่าง 3"],
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%23f59e0b' font-size='22' font-family='sans-serif' font-weight='bold'>BEFORE: ข้าวติดลูกรีดสะสม</text><text x='300' y='230' text-anchor='middle' fill='%2394a3b8' font-size='14' font-family='sans-serif'>สภาพลูกรีดเดิมยังไม่มีสารเคลือบ Teflon</text></svg>"
  },
  {
    id: "imp-02",
    type: "Improvement",
    title: "ติดตั้งระบบเซนเซอร์แจ้งเตือนและปิดฝา Rice Mixer อัตโนมัติ",
    description: "เพิ่ม Limit Switch และระบบลมควบคุมฝาปิดเพื่อความปลอดภัยของพนักงานซ่อมบำรุงและฝ่ายผลิต",
    machineId: "RIM02",
    startDate: "2026-06-01",
    plannedEndDate: "2026-06-08",
    workLogs: [
      { id: "wl-3", date: "2026-06-02", hours: 3, note: "ติดตั้งสวิตช์ความปลอดภัยและต่อขั้วสายควบคุมไฟฟ้าประสานงานหน้าแผงวงจร" },
      { id: "wl-4", date: "2026-06-05", hours: 5, note: "ทดสอบการทำงาน Safety Interlock เสร็จสิ้นสมบูรณ์เป็นที่น่าพอใจ" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 4",
    technicians: ["ช่าง 4"],
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%23f59e0b' font-size='22' font-family='sans-serif' font-weight='bold'>BEFORE: เปิดฝาได้โดยไม่มี Interlock</text></svg>",
    photoAfter: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23064e3b'/><rect x='40' y='40' width='520' height='320' fill='%23022c22' stroke='%2310b981' stroke-width='4' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%2334d399' font-size='22' font-family='sans-serif' font-weight='bold'>AFTER: ติดตั้ง Limit Switch และไฟเตือน Safety</text></svg>"
  }
];

export const PRELOADED_SCHEDULES = [
  {
    id: "sched-01",
    type: "PM",
    technician: "ช่าง 1",
    date: "2026-06-10",
    machineId: "RIM01",
    pmPlanId: "plan-pm-01",
    status: "รอดำเนินการ",
    duration: 45
  },
  {
    id: "sched-02",
    type: "Operation",
    technician: "ช่าง 2",
    date: "2026-06-10",
    line: "ไลน์ซูชิ A",
    startTime: "08:00",
    endTime: "16:00",
    isWeeklyRecurring: true,
    recurringDays: [1, 2, 3, 4, 5],
    duration: 480
  },
  {
    id: "sched-03",
    type: "PM",
    technician: "ช่าง 5",
    date: "2026-06-09", // Overdue PM task on 9 Jun if status is 'รอดำเนินการ'
    machineId: "FFS01",
    pmPlanId: "plan-pm-03",
    status: "รอดำเนินการ",
    duration: 30
  },
  {
    id: "sched-04",
    type: "PM",
    technician: "ช่าง 3",
    technicians: ["ช่าง 3", "ช่าง 4"],
    date: "2026-06-08",
    machineId: "VAC01",
    pmPlanId: "plan-pm-02",
    status: "เสร็จสิ้น",
    duration: 60,
    actualDuration: 85,
    overtimeReason: "พบชิ้นส่วนซีลยางสึกหรอผิดปกติ และน็อตยึดฝาสุญญากาศเกิดสนิมเกาะ ต้องขัดล้างและปรับแต่งหน้างานเพิ่มเติม",
    usedParts: [
      { partId: "SP-002", quantity: 1, pricePerUnit: 450, totalCost: 450 }
    ],
    otherCost: 0
  }
];

export const PRELOADED_SETUPS = [
  {
    id: "setup-01",
    machineId: "FFS01",
    date: "2026-06-10",
    type: "Setupก่อนผลิต",
    technicians: ["ช่าง 1", "ช่าง 2"],
    totalDuration: 55,
    note: "เตรียมความพร้อมไลน์บรรจุ เช้ากะหนึ่ง",
    steps: [
      { stepName: "ตั้งเครื่อง", duration: 15, completed: true },
      { stepName: "ร้อยฟิล์ม", duration: 15, completed: true },
      { stepName: "ตั้งฟิล์ม", duration: 10, completed: true },
      { stepName: "ต่อฟิล์ม", duration: 5, completed: true },
      { stepName: "ตั้งเครื่องพิมพ์วันที่", duration: 10, completed: true }
    ]
  },
  {
    id: "setup-02",
    machineId: "ATS01",
    date: "2026-06-10",
    type: "ปรับเครื่องระหว่างวัน",
    technicians: ["ช่าง 3"],
    totalDuration: 25,
    note: "ปรับตั้งเครื่องพิมพ์วันที่เลอะ ฟิล์มเอียงเล็กน้อย",
    steps: [
      { stepName: "ตั้งเครื่อง", duration: 0, completed: false },
      { stepName: "ร้อยฟิล์ม", duration: 0, completed: false },
      { stepName: "ตั้งฟิล์ม", duration: 10, completed: true },
      { stepName: "ต่อฟิล์ม", duration: 5, completed: true },
      { stepName: "ตั้งเครื่องพิมพ์วันที่", duration: 10, completed: true }
    ]
  },
  {
    id: "setup-03",
    machineId: "FFS02",
    date: "2026-06-09",
    type: "Setupก่อนผลิต",
    technicians: ["ช่าง 4"],
    totalDuration: 40,
    note: "Setup ทั่วไปก่อนเริ่มงานวันจันทร์",
    steps: [
      { stepName: "ตั้งเครื่อง", duration: 10, completed: true },
      { stepName: "ร้อยฟิล์ม", duration: 15, completed: true },
      { stepName: "ตั้งฟิล์ม", duration: 5, completed: true },
      { stepName: "ต่อฟิล์ม", duration: 5, completed: true },
      { stepName: "ตั้งเครื่องพิมพ์วันที่", duration: 5, completed: true }
    ]
  }
];

export const PRELOADED_SPARE_PARTS = [
  {
    id: "SP-01",
    name: "ลวดฮีตเตอร์เครื่องแวคคั่ม (Heating element 10mm)",
    category: "อุปกรณ์ไฟฟ้าและทำความร้อน",
    machineIds: ["VAC01", "VAC02"],
    quantity: 3,
    minRequired: 5,
    unit: "เส้น",
    location: "ตู้ A ชั้น 1",
    pricePerUnit: 350,
    lastRestockedDate: "2026-06-01",
    specifications: "ขนาด 10 มม. ความยาว 600 มม. ทนกำลังไฟสายตรง"
  },
  {
    id: "SP-02",
    name: "เทปเทฟลอนทนความร้อน (Teflon glass fiber tape)",
    category: "วัสดุสิ้นเปลือง",
    machineIds: ["VAC01", "VAC02", "FFS01", "FFS02", "BAN01"],
    quantity: 12,
    minRequired: 4,
    unit: "ม้วน",
    location: "ตู้ A ชั้น 2",
    pricePerUnit: 280,
    lastRestockedDate: "2026-06-15",
    specifications: "หน้ากว้าง 2 นิ้ว ทนความร้อนสูงสุด 300 องศาเซลเซียส"
  },
  {
    id: "SP-03",
    name: "ใบมีดตัดซองฟันปลาเครื่องซีลแนวตั้ง (Zigzag cutter blade)",
    category: "ระบบเครื่องกล",
    machineIds: ["FFS01", "FFS02"],
    quantity: 2,
    minRequired: 2,
    unit: "ใบ",
    location: "ตู้ B ชั้น 1",
    pricePerUnit: 1200,
    lastRestockedDate: "2026-05-20",
    specifications: "ทำจากเหล็กกล้าไฮสปีดชุบแข็ง ทนทานความยาว 210 มม."
  },
  {
    id: "SP-04",
    name: "ลูกยางตัวดูดสุญญากาศซิลิโคน (Vacuum cup silicone)",
    category: "นิวเมติกส์",
    machineIds: ["ATS01", "RJT01"],
    quantity: 18,
    minRequired: 6,
    unit: "ตัว",
    location: "ตู้ B ชั้น 2",
    pricePerUnit: 120,
    lastRestockedDate: "2026-06-10",
    specifications: "ทำจากซิลิโคน Food Grade ทนเย็นและร้อน ไม่แข็งกรอบง่าย"
  },
  {
    id: "SP-05",
    name: "โซลินอยด์วาล์วคุมลมกระบอกสูบ (Solenoid valve 24VDC)",
    category: "นิวเมติกส์",
    machineIds: ["RIM01", "FFS01", "ATS01", "RJT01"],
    quantity: 4,
    minRequired: 3,
    unit: "ตัว",
    location: "ตู้ C ชั้น 1",
    pricePerUnit: 950,
    lastRestockedDate: "2026-06-05",
    specifications: "ขนาดพอร์ต 1/8, แรงดันไฟ 24VDC ยี่ห้อ SMC"
  },
  {
    id: "SP-06",
    name: "ตลับลูกปืนเม็ดกลมสแตนเลส (SS Bearings 6204-2RS)",
    category: "ระบบส่งกำลัง",
    machineIds: ["RIM01", "TOC01", "BAN01"],
    quantity: 1,
    minRequired: 4,
    unit: "ตลับ",
    location: "ตู้ D ชั้น 1",
    pricePerUnit: 450,
    lastRestockedDate: "2026-04-12",
    specifications: "สแตนเลส SUS440C ซีลยางกันน้ำสองข้าง เหมาะสำหรับอุตสาหกรรมอาหาร"
  },
  {
    id: "SP-07",
    name: "สายพานแบนไทม์มิ่งขับเคลื่อน (Conveyor timing belt)",
    category: "ระบบส่งกำลัง",
    machineIds: ["ROC01", "BAN01", "MTD01", "XRA01"],
    quantity: 6,
    minRequired: 2,
    unit: "เส้น",
    location: "ตู้ D ชั้น 2",
    pricePerUnit: 800,
    lastRestockedDate: "2026-06-18",
    specifications: "สายพานยางสังเคราะห์ ทนต่อน้ำมันพืชและความร้อน"
  },
  {
    id: "SP-08",
    name: "เซนเซอร์ตาแมวตรวจจับชิ้นงาน (Photoelectric sensor NPN)",
    category: "อุปกรณ์ไฟฟ้าและทำความร้อน",
    machineIds: ["RIM01", "FFS01", "FFS02", "ATS01", "RJT01"],
    quantity: 1,
    minRequired: 3,
    unit: "ชุด",
    location: "ตู้ E ชั้น 1",
    pricePerUnit: 1500,
    lastRestockedDate: "2026-05-18",
    specifications: "เซนเซอร์จับวัตถุระยะทำงาน 10 ซีซี ชนิด NPN NO/NC"
  }
];

export const PRELOADED_CD5_PROJECTS: CD5Project[] = [
  {
    id: "CD5-2026-001",
    title: "เขียนแบบสั่งทำชุดใบมีดตัดซีลสุญญากาศ สแตนเลส SUS440C แทนสั่ง OEM ญี่ปุ่น",
    category: "เขียนแบบสั่งทำเอง (Custom Fabrication)",
    machineId: "VAC01",
    partName: "ใบมีดตัดปากถุงสุญญากาศ (Vacuum Chamber Sealing Cutter)",
    partCode: "BLD-VAC-440",
    proposerTechnician: "ช่างสมศักดิ์",
    coTechnicians: ["ช่างอนุชา", "ช่างกิตติศักดิ์"],
    startDate: "2026-02-10",
    approvedDate: "2026-04-15",
    installedDate: "2026-04-16",
    status: "อนุมัติใช้งานจริง",
    
    // Original
    originalSupplier: "ผู้ผลิตเครื่องแพ็คสุญญากาศ OEM ประเทศญี่ปุ่น",
    originalPrice: 14500,
    originalLifespanDays: 45,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "เป็นเหล็กคาร์บอนเคลือบ รอสั่งผลิตและขนส่ง 45-60 วัน มีปัญหาสนิมผิวจากไอน้ำเกลือในอาหาร สึกหรอเร็ว",
    
    // New Custom
    newSupplierOrFabricator: "โรงกลึง CNC พรีซิชั่นในประเทศ (ช่างเขียนแบบ CAD 2D/3D เอง)",
    newPrice: 3200,
    newLifespanDays: 120,
    newLifespanUnit: "วัน",
    newQualityNotes: "อัปเกรดเป็น Stainless Steel SUS440C ชุบแข็ง Vacuum Heat Treatment HRC 58-60 คมกริบ ไร้สนิม ทนกรดเกลือ 100% สอดคล้อง Food Grade GMP",
    
    // Metrics
    annualUsageQty: 8,
    annualOriginalCost: 116000,
    annualNewCost: 25600,
    annualSavings: 90400,
    savingsPercent: 77.9,
    lifespanExtensionPercent: 166.7,

    engineeringDetails: "วิศวกรและช่างถอดชิ้นส่วนเดิมมาเขียนแบบ Drawing ใน SolidWorks ปรับมุมคมมีดจาก 30° เป็น 28° พร้อมเพิ่มร่องระบายเศษฟิล์ม ส่งร้านกลึง CNC ชุบแข็งสุญญากาศ",
    foodGradeCompliance: true,
    safetyNotes: "ทดสอบการตัดฟิล์ม Nylon/PE หนา 120 ไมครอน ต่อเนื่อง 100,000 ซอง ขอบตัดเรียบกริบ ไม่มีเศษฝุ่นฟิล์มตกค้าง",
    createdAt: "2026-02-10",

    usageHistory: [
      {
        id: "HIST-001-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-02-15",
        replacedDate: "2026-06-15",
        status: "COMPLETED_REPLACED",
        actualRunningDays: 120,
        targetLifespanDays: 120,
        originalOemDays: 45,
        lifespanExtensionPercent: 166.7,
        wearCondition: "คมมีดยังตัดได้ดี สึกหรอสม่ำเสมอ ไร้สนิม ถอดเปลี่ยนเพื่อประเมินความล้าของโลหะตามรอบ",
        technician: "ช่างสมศักดิ์",
        notes: "ทดสอบรอบแรกผ่านฉลุย เทียบกับ OEM ที่เปลี่ยนทุก 45 วัน ยืดอายุได้เกือบ 3 เท่าตัว"
      },
      {
        id: "HIST-001-2",
        cycleNumber: 2,
        partType: "NEW_CUSTOM",
        installedDate: "2026-06-16",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 65,
        targetLifespanDays: 120,
        originalOemDays: 45,
        lifespanExtensionPercent: 166.7,
        wearCondition: "สมบูรณ์ 100% คมมีดตัดขาดเรียบ ซีลสุญญากาศไม่รั่วซึม",
        technician: "ช่างอนุชา",
        notes: "ติดตั้งใช้งานจริงชุดที่ 2 เดินเครื่องต่อเนื่องในไลน์แพ็คสุญญากาศ VAC01"
      }
    ]
  },
  {
    id: "CD5-2026-002",
    title: "เปลี่ยนวัสดุบูชสวมแกนลูกกลิ้งลำเลียงเป็น Food Grade PEEK ยืดอายุ 3 เท่า ไม่ต้องทาจาระบี",
    category: "ยืดอายุการใช้งาน (Lifetime Extension)",
    machineId: "TOC01",
    partName: "บูชแบริ่งสวมแกนคอนเวเยอร์ข้าว (Self-Lubricating Conveyor Bushing)",
    partCode: "BSH-PEEK-25",
    proposerTechnician: "ช่างวิชัย",
    coTechnicians: ["ช่างสมศักดิ์"],
    startDate: "2026-03-01",
    approvedDate: "2026-05-20",
    installedDate: "2026-05-22",
    status: "อนุมัติใช้งานจริง",

    // Original
    originalSupplier: "บูชทองเหลืองหล่อลื่นบรอนซ์ OEM เดิม",
    originalPrice: 1850,
    originalLifespanDays: 60,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "ต้องอัดจาระบี Food Grade ทุกสัปดาห์ เสี่ยงปนเปื้อนแป้งข้าว สึกหรอเร็วเมื่อถูกน้ำล้าง CIP ประจำวัน",

    // New Custom
    newSupplierOrFabricator: "สั่งฉีดขึ้นรูปพลาสติกวิศวกรรม PEEK (Polyether ether ketone) Food Contact FDA",
    newPrice: 750,
    newLifespanDays: 240,
    newLifespanUnit: "วัน",
    newQualityNotes: "หล่อลื่นในตัว ทนอุณหภูมิ -50 ถึง +250°C ทนน้ำยาล้างด่าง/กรด CIP ได้ดีเยี่ยม ลดความถี่ PM อัดจาระบีเป็น 0",

    // Metrics
    annualUsageQty: 24,
    annualOriginalCost: 44400,
    annualNewCost: 18000,
    annualSavings: 26400,
    savingsPercent: 59.5,
    lifespanExtensionPercent: 300.0,

    engineeringDetails: "คำนวณพิกัดความเผื่อ H7/e8 สำหรับ PEEK Polymer สั่งตัดและกลึงตามขนาดเพลา SUS316L ไม่กินแกนเพลา",
    foodGradeCompliance: true,
    safetyNotes: "ผ่านการทดสอบ Migration Test ตามมาตรฐาน EU Food Contact 10/2011 และ US FDA 21 CFR 177.2415",
    createdAt: "2026-03-01",

    usageHistory: [
      {
        id: "HIST-002-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-05-22",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 89,
        targetLifespanDays: 240,
        originalOemDays: 60,
        lifespanExtensionPercent: 300.0,
        wearCondition: "ผิวสัมผัสเรียบเนียน ไม่มีรอยขูดขีดบนแกนเพลา SUS316L ไม่พบการสึกหรอผิดปกติ",
        technician: "ช่างวิชัย",
        notes: "ผ่าน 60 วัน (อายุเดิมของบูชทองเหลือง) ไปแล้วโดยยังไม่ต้องอัดจาระบีแม้แต่ครั้งเดียว"
      }
    ]
  },
  {
    id: "CD5-2026-003",
    title: "เทียบเคียงซีลสุญญากาศ Silicone Sponge โปรไฟล์เทียบเคียงแบรนด์ในประเทศ ลดค่าใช้จ่าย 65%",
    category: "เทียบเคียงแบรนด์ทางเลือก (Equivalent Brand)",
    machineId: "ATS01",
    partName: "ยางซีลขอบฝาเครื่องซีลถาดอัตโนมัติ (Silicone Sponge Gasket Profile)",
    partCode: "GSK-SIL-ATS",
    proposerTechnician: "ช่างธนพล",
    coTechnicians: ["ช่างอนุชา"],
    startDate: "2026-04-10",
    approvedDate: "2026-06-01",
    installedDate: "2026-06-02",
    status: "อนุมัติใช้งานจริง",

    // Original
    originalSupplier: "ผู้แทนจำหน่ายอะไหล่เครื่องซีลถาดต่างประเทศ",
    originalPrice: 4200,
    originalLifespanDays: 90,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "ขายยกชุดขอบพร้อมโครง ราคาแพง ยางแข็งตัวและยุบตัวหลังใช้งาน 3 เดือน",

    // New Custom
    newSupplierOrFabricator: "ผู้ผลิตโปรไฟล์ยางซิลิโคนฟู้ดเกรดในไทย สั่งม้วน 50 เมตร ตัดใส่เอง",
    newPrice: 1450,
    newLifespanDays: 120,
    newLifespanUnit: "วัน",
    newQualityNotes: "ซิลิโคนฟองน้ำความยืดหยุ่นสูง คืนตัวได้ 98% ทนความร้อน 220°C ซีลสุญญากาศแนบสนิท ค่ารั่วไหล 0%",

    // Metrics
    annualUsageQty: 12,
    annualOriginalCost: 50400,
    annualNewCost: 17400,
    annualSavings: 33000,
    savingsPercent: 65.5,
    lifespanExtensionPercent: 33.3,

    engineeringDetails: "ทำ Jig ตัดต่อมุม 45° ด้วยกาวซิลิโคน RTV Food Grade เชื่อมต่อไร้รอยตะเข็บ",
    foodGradeCompliance: true,
    safetyNotes: "ผ่านการทดสอบ Leak Test สุญญากาศ -98 kPa ไม่มีลมรั่ว",
    createdAt: "2026-04-10",

    usageHistory: [
      {
        id: "HIST-003-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-06-02",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 78,
        targetLifespanDays: 120,
        originalOemDays: 90,
        lifespanExtensionPercent: 33.3,
        wearCondition: "แรงคืนตัวดีเยี่ยม ไม่ยุบตัว สุญญากาศแนบสนิท",
        technician: "ช่างธนพล",
        notes: "ประหยัดต้นทุนไป 65% คุณภาพการซีลถาดเทียบเท่าของ OEM"
      }
    ]
  },
  {
    id: "CD5-2026-004",
    title: "ซ่อมฟื้นฟูสภาพแกนเพลาใบกวนผสมข้าว ด้วยเทคนิคพ่นพอกฮาร์ดโครม & เจียระไนใหม่",
    category: "ซ่อมฟื้นฟูสภาพ (Reconditioning)",
    machineId: "RIM01",
    partName: "แกนเพลาใบกวนผสมข้าวหลัก (Main Mixer Agitator Shaft SUS304)",
    partCode: "SFT-RIM-01",
    proposerTechnician: "ช่างสมศักดิ์",
    coTechnicians: ["ช่างวิชัย", "ช่างกิตติศักดิ์"],
    startDate: "2026-05-15",
    installedDate: "2026-05-28",
    status: "กำลังทดสอบ",

    // Original
    originalSupplier: "สั่งเบิกชุดเพลาใหม่ทั้งท่อนจากตัวแทนจำหน่าย",
    originalPrice: 48000,
    originalLifespanDays: 365,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "เพลาเดิมรอยซีลกัดเป็นร่องลึก 1.5 มม. เมื่อก่อนต้องทิ้งและซื้อเพลาใหม่ทั้งท่อน",

    // New Custom
    newSupplierOrFabricator: "โรงชุบฮาร์ดโครมอุตสาหกรรม + โรงกลึงเจียระไนทรงกระบอกความเที่ยงตรงสูง",
    newPrice: 8500,
    newLifespanDays: 500,
    newLifespanUnit: "วัน",
    newQualityNotes: "พ่นพอกและชุบ Hard Chrome หนา 0.5 มม. ผิวเรียบกระจก Ra 0.2 แข็งแรงทนรอยขีดข่วนกว่าสแตนเลสเปลือย 2 เท่า",

    // Metrics
    annualUsageQty: 2,
    annualOriginalCost: 96000,
    annualNewCost: 17000,
    annualSavings: 79000,
    savingsPercent: 82.3,
    lifespanExtensionPercent: 37.0,

    engineeringDetails: "กลึงปาดร่องเดิมออก 0.8 มม. พ่นพอกผิวด้วยลวดเชื่อมสแตนเลสพิเศษ ชุบฮาร์ดโครม และเจียรนัยจนได้ขนาดเส้นผ่าศูนย์กลางมาตรฐานเดิม 50.00 mm (Tolerance h6)",
    foodGradeCompliance: true,
    safetyNotes: "ตรวจเช็ค Run-out ความคดเพลาด้วย Dial Gauge ได้ค่า < 0.02 mm",
    createdAt: "2026-05-15",

    usageHistory: [
      {
        id: "HIST-004-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-05-28",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 83,
        targetLifespanDays: 500,
        originalOemDays: 365,
        lifespanExtensionPercent: 37.0,
        wearCondition: "ผิวฮาร์ดโครมเงาใส ไร้รอยซีลกัด อุณหภูมิแบริ่งปกติ 42°C",
        technician: "ช่างสมศักดิ์",
        notes: "ทดสอบเดินเครื่องกวนข้าวผสม 3 กะต่อวัน ไม่พบการรั่วซึมที่ซีลเพลา"
      }
    ]
  },
  {
    id: "CD5-2026-005",
    title: "ออกแบบแผ่นเทฟลอนกันติดรองฮีตเตอร์ตัดฟิล์ม ซ่อมเปลี่ยนเฉพาะจุด ประหยัดค่าเทปทนความร้อน",
    category: "ลดต้นทุนงาน PM/ซ่อม (PM/Repair Cost Down)",
    machineId: "FFS01",
    partName: "ชุดรางประกบฮีตเตอร์ตัดฟิล์ม PTFE Plate Insulator",
    partCode: "PTFE-FFS-01",
    proposerTechnician: "ช่างกิตติศักดิ์",
    coTechnicians: ["ช่างธนพล"],
    startDate: "2026-06-01",
    installedDate: "2026-06-05",
    status: "ประเมินผล",

    // Original
    originalSupplier: "ใช้เทปเทฟลอนแปะทับลวดฮีตเตอร์ เปลี่ยนบ่อยทุก 3 วัน",
    originalPrice: 3500,
    originalLifespanDays: 14,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "เทปไหม้และขาดง่าย กาวเทปเหนียวเกาะติดฮีตเตอร์ทำให้ความร้อนไม่สม่ำเสมอ",

    // New Custom
    newSupplierOrFabricator: "กัดร่องแผ่นแผ่น Virgin PTFE บริสุทธิ์ สอดลวดฮีตเตอร์ด้านใน ถอดกลับด้านได้ 2 ฝั่ง",
    newPrice: 1100,
    newLifespanDays: 90,
    newLifespanUnit: "วัน",
    newQualityNotes: "แผ่นเทฟลอนหนา 5 มม. ทนความร้อนสูง 260°C ฟิล์มไม่ติดไหม้ ผิวสะอาด ทำความสะอาดง่าย",

    // Metrics
    annualUsageQty: 6,
    annualOriginalCost: 21000,
    annualNewCost: 6600,
    annualSavings: 14400,
    savingsPercent: 68.6,
    lifespanExtensionPercent: 542.9,

    engineeringDetails: "เขียนแบบ CAD กัดร่องขนาด 1.2 มม. สำหรับวางลวด Nichrome 80 ให้พอดี ไม่ใช้กาวเคมี",
    foodGradeCompliance: true,
    safetyNotes: "ลดเวลา PM ทำความสะอาดคราบกาวไหม้ลง 30 นาทีต่อเครื่อง",
    createdAt: "2026-06-01",

    usageHistory: [
      {
        id: "HIST-005-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-06-05",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 75,
        targetLifespanDays: 90,
        originalOemDays: 14,
        lifespanExtensionPercent: 542.9,
        wearCondition: "รอยไหม้ 0% แผ่นเทฟลอนขาวสะอาด ไม่มีคราบพลาสติกติด",
        technician: "ช่างกิตติศักดิ์",
        notes: "ทดลองใช้งานเกิน 70 วันแล้ว เทียบกับของเดิมที่ต้องแปะเทปใหม่ทุก 3-14 วัน ประหยัดเวลาช่างและค่าเทปได้มหาศาล"
      }
    ]
  }
];

export const PRELOADED_TIME_BREAK_PARTS: TimeBreakPartItem[] = [
  {
    id: "tb-001",
    machineId: "RIM01",
    partName: "สายพานส่งกำลังไทม์มิ่ง (Timing Belt HTD-8M-1200)",
    partCode: "SP-05",
    componentLocation: "ชุดขับเคลื่อนสายพานขับมอเตอร์หลัก",
    startDate: "2026-06-10",
    intervalValue: 3,
    intervalUnit: "เดือน",
    cycleCount: 2,
    nextDueDate: "2026-09-10",
    lastReplacedDate: "2026-06-10",
    notes: "เปลี่ยนตามรอบ Time-Break ไตรมาส ตรวจเช็คความตึงและรอยแตกลายงา",
    costPerUnit: 1250,
    assignedTechnician: "ช่าง 1",
    history: [
      { id: "h-01", replacedDate: "2026-03-10", cycleNumber: 1, technician: "ช่าง 1", note: "เริ่มติดตั้งรอบแรก" },
      { id: "h-02", replacedDate: "2026-06-10", cycleNumber: 2, technician: "ช่าง 1", note: "เปลี่ยนรอบที่ 2 สภาพฟันสึกหรอปานกลาง" }
    ]
  },
  {
    id: "tb-002",
    machineId: "RIM01",
    partName: "ตลับลูกปืนสแตนเลส (Stainless Bearing 6205-2RS Food Grade)",
    partCode: "SP-01",
    componentLocation: "แกนเพลาใบกวนผสมข้าวห้องคลุก",
    startDate: "2026-08-15",
    intervalValue: 1,
    intervalUnit: "เดือน",
    cycleCount: 3,
    nextDueDate: "2026-09-15",
    lastReplacedDate: "2026-08-15",
    notes: "ตลับลูกปืนสัมผัสไอน้ำร้อนสูง ต้องเปลี่ยนทุกเดือนเพื่อป้องกันการติดขัด",
    costPerUnit: 480,
    assignedTechnician: "ช่าง 2",
    history: [
      { id: "h-03", replacedDate: "2026-07-15", cycleNumber: 2, technician: "ช่าง 2", note: "เปลี่ยนประจำเดือน 7" },
      { id: "h-04", replacedDate: "2026-08-15", cycleNumber: 3, technician: "ช่าง 2", note: "เปลี่ยนตามรอบเดือน 8 จาระบีเริ่มเสื่อม" }
    ]
  },
  {
    id: "tb-003",
    machineId: "TOC01",
    partName: "สายพานลำเลียง PU สีขาว Food Grade (Cleated Belt)",
    partCode: "SP-02",
    componentLocation: "ชุดสายพานลำเลียงข้าวเข้าสู่ไลน์แพ็ค",
    startDate: "2026-03-20",
    intervalValue: 6,
    intervalUnit: "เดือน",
    cycleCount: 1,
    nextDueDate: "2026-09-20",
    lastReplacedDate: "2026-03-20",
    notes: "ครบกำหนดรอบ 6 เดือน ตรวจสอบรอยต่อและบั้งกั้น",
    costPerUnit: 3500,
    assignedTechnician: "ช่าง 3",
    history: [
      { id: "h-05", replacedDate: "2026-03-20", cycleNumber: 1, technician: "ช่าง 3", note: "ติดตั้งรอบแรกของปี 2026" }
    ]
  },
  {
    id: "tb-004",
    machineId: "TOC02",
    partName: "ซีลยางกันฝุ่น Viton O-Ring & Dust Seal",
    partCode: "SP-08",
    componentLocation: "ตลับลูกปืนดรัมขับหัวสายพาน",
    startDate: "2026-08-05",
    intervalValue: 1,
    intervalUnit: "เดือน",
    cycleCount: 4,
    nextDueDate: "2026-09-05",
    lastReplacedDate: "2026-08-05",
    notes: "เลยกำหนดรอบเดือน 9 มาเล็กน้อย ต้องรีบดำเนินการเปลี่ยน",
    costPerUnit: 180,
    assignedTechnician: "ช่าง 4",
    history: [
      { id: "h-06", replacedDate: "2026-08-05", cycleNumber: 4, technician: "ช่าง 4", note: "เปลี่ยนตามรอบปกติ" }
    ]
  },
  {
    id: "tb-005",
    machineId: "VAC01",
    partName: "ชุดไส้กรองสุญญากาศและซีลฝาถัง (Vacuum Filter & Lid Gasket)",
    partCode: "SP-03",
    componentLocation: "ห้องสุญญากาศหลักและชุดวาล์วระบายแรงดัน",
    startDate: "2026-08-12",
    intervalValue: 1,
    intervalUnit: "เดือน",
    cycleCount: 5,
    nextDueDate: "2026-09-12",
    lastReplacedDate: "2026-08-12",
    notes: "ไส้กรองดักละอองน้ำมันและไอน้ำ ทำความสะอาดและเปลี่ยนใหม่ทุกเดือน",
    costPerUnit: 890,
    assignedTechnician: "ช่าง 5",
    history: [
      { id: "h-07", replacedDate: "2026-08-12", cycleNumber: 5, technician: "ช่าง 5", note: "เปลี่ยนไส้กรองชุดใหม่ สุญญากาศทำงานเต็มประสิทธิภาพ" }
    ]
  },
  {
    id: "tb-006",
    machineId: "FFS01",
    partName: "ใบมีดตัดฟิล์มสแตนเลสฟันปลา (Rotary Zigzag Knife)",
    partCode: "SP-04",
    componentLocation: "ชุดลูกกลิ้งตัดฟิล์มแนวขวางด้านท้าย (End Sealer & Cutter)",
    startDate: "2026-08-25",
    intervalValue: 30,
    intervalUnit: "วัน",
    cycleCount: 6,
    nextDueDate: "2026-09-24",
    lastReplacedDate: "2026-08-25",
    notes: "ใบมีดตัดซองฟิล์มพลาสติก ครบอายุใช้งานทุก 30 วัน",
    costPerUnit: 2200,
    assignedTechnician: "ช่าง 1",
    history: [
      { id: "h-08", replacedDate: "2026-08-25", cycleNumber: 6, technician: "ช่าง 1", note: "เปลี่ยนใบมีดและตั้งค่าระยะห่าง Gap ใหม่" }
    ]
  },
  {
    id: "tb-007",
    machineId: "ATS01",
    partName: "ลวดความร้อนฮีตเตอร์และแผ่นเทฟลอนซีลปากถาด (Nichrome Wire & Teflon Bar)",
    partCode: "SP-06",
    componentLocation: "หัวกดซีลถาดบรรจุภัณฑ์ด้านบน",
    startDate: "2026-09-02",
    intervalValue: 15,
    intervalUnit: "วัน",
    cycleCount: 8,
    nextDueDate: "2026-09-17",
    lastReplacedDate: "2026-09-02",
    notes: "เปลี่ยนแผ่นเทฟลอนและขดลวดฮีตเตอร์ทุก 15 วันเพื่อรอยซีลสนิท 100%",
    costPerUnit: 350,
    assignedTechnician: "ช่าง 2",
    history: [
      { id: "h-09", replacedDate: "2026-09-02", cycleNumber: 8, technician: "ช่าง 2", note: "เปลี่ยนรอบที่ 8 รอยซีลเรียบสนิท" }
    ]
  },
  {
    id: "tb-008",
    machineId: "BAN01",
    partName: "ใบมีดตัดสายรัดและสปริงดัน (Strap Cutter Blade & Tension Spring)",
    partCode: "SP-07",
    componentLocation: "ชุดหัวยิงสายรัดและใบมีดตัดกล่อง",
    startDate: "2026-07-28",
    intervalValue: 2,
    intervalUnit: "เดือน",
    cycleCount: 3,
    nextDueDate: "2026-09-28",
    lastReplacedDate: "2026-07-28",
    notes: "รอบเปลี่ยนทุก 2 เดือน",
    costPerUnit: 650,
    assignedTechnician: "ช่าง 3",
    history: [
      { id: "h-10", replacedDate: "2026-07-28", cycleNumber: 3, technician: "ช่าง 3", note: "เปลี่ยนใบมีดและสปริงใหม่" }
    ]
  },
  {
    id: "tb-009",
    machineId: "BCF01",
    partName: "ซีลยางขอบประตูและพัดลมระบายความเย็น (Silicone Door Gasket)",
    partCode: "SP-09",
    componentLocation: "โครงสร้างบานประตูห้องแช่เยือกแข็ง -40°C",
    startDate: "2026-06-15",
    intervalValue: 3,
    intervalUnit: "เดือน",
    cycleCount: 2,
    nextDueDate: "2026-09-15",
    lastReplacedDate: "2026-06-15",
    notes: "ซีลซิลิโคนทนความเย็นจัด ตรวจสอบการแข็งตัวและแตกร้าว",
    costPerUnit: 1850,
    assignedTechnician: "ช่าง 4",
    history: [
      { id: "h-11", replacedDate: "2026-06-15", cycleNumber: 2, technician: "ช่าง 4", note: "เปลี่ยนยางขอบประตู ป้องกันลมรั่วซึม" }
    ]
  }
];



