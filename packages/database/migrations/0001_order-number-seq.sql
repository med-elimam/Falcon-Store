-- تسلسل آمن ضد التسابق لأرقام الطلبات (FLC-1001 وما بعده)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1001 INCREMENT BY 1;
