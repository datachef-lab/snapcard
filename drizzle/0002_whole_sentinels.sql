CREATE TABLE "id_card_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"admission_year" varchar(255) NOT NULL,
	"name_coordinates" json NOT NULL,
	"course_coordinates" json NOT NULL,
	"uid_coordinates" json NOT NULL,
	"mobile_coordinates" json NOT NULL,
	"bloodGroup_coordinates" json NOT NULL,
	"sports_quota_coordinates" json NOT NULL,
	"qrcode_coordinates" json NOT NULL,
	"qrcode_size" integer NOT NULL,
	"valid_till_date_coordinates" json,
	"photo_dimensions" json NOT NULL,
	"disabled" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
