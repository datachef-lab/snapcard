import { NextRequest, NextResponse } from 'next/server';
import { IdCardTemplate } from '@/lib/db/schema';
import * as admissionYearService from '@/lib/services/id-card-template.service';

// GET: List all templates
export async function GET() {
  const templates = await admissionYearService.getAllIdCardTemplates();
  return NextResponse.json({ success: true, data: templates });
}

// POST: Create a new template
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const givenTemplate: Partial<IdCardTemplate> = {};
  for (const [key, value] of formData.entries()) {
    switch (key) {
      case 'nameCoordinates':
        givenTemplate.nameCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'courseCoordinates':
        givenTemplate.courseCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'uidCoordinates':
        givenTemplate.uidCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'mobileCoordinates':
        givenTemplate.mobileCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'bloodGroupCoordinates':
        givenTemplate.bloodGroupCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'sportsQuotaCoordinates':
        givenTemplate.sportsQuotaCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'qrcodeCoordinates':
        givenTemplate.qrcodeCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'validTillDateCoordinates':
        givenTemplate.validTillDateCoordinates = value ? JSON.parse(value as string) : undefined;
        break;
      case 'photoDimension':
        givenTemplate.photoDimension = value ? JSON.parse(value as string) : undefined;
        break;
      case 'qrcodeSize':
        givenTemplate.qrcodeSize = Number(value);
        break;
      case 'disabled':
        givenTemplate.disabled = value === 'true' || value === '1';
        break;
      case 'admissionYear':
        givenTemplate.admissionYear = String(value);
        break;
    }
  }
  // Fill missing required fields with defaults
  const requiredJsonFields = [
    'nameCoordinates',
    'courseCoordinates',
    'uidCoordinates',
    'mobileCoordinates',
    'bloodGroupCoordinates',
    'sportsQuotaCoordinates',
    'qrcodeCoordinates',
    'validTillDateCoordinates',
    'photoDimension'
  ];
  const defaultValues: Record<string, unknown> = {
    nameCoordinates: { x: 0, y: 0 },
    courseCoordinates: { x: 0, y: 0 },
    uidCoordinates: { x: 0, y: 0 },
    mobileCoordinates: { x: 0, y: 0 },
    bloodGroupCoordinates: { x: 0, y: 0 },
    sportsQuotaCoordinates: { x: 0, y: 0 },
    qrcodeCoordinates: { x: 0, y: 0 },
    validTillDateCoordinates: { x: 0, y: 0 },
    photoDimension: { x: 0, y: 0, width: 0, height: 0 }
  };
  for (const key of requiredJsonFields) {
    if (!givenTemplate[key as keyof IdCardTemplate]) {
      givenTemplate[key as keyof IdCardTemplate] = defaultValues[key];
    }
  }
  const templateFile = formData.get('templateFile');
  const created = await admissionYearService.createIdCardTemplate(givenTemplate as IdCardTemplate, templateFile instanceof File ? templateFile : undefined);
  return NextResponse.json({ success: true, data: created });
}

// PUT: Update a template (by id)
export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const templateFile = formData.get('templateFile') as File | null;
  const rawData = formData.get('templateData');

  if (!rawData) {
    return NextResponse.json({ success: false, error: "Missing template data." }, { status: 400 });
  }

  const templateData = JSON.parse(rawData as string) as IdCardTemplate;
  const updated = await admissionYearService.updateIdCardTemplate(templateData, templateFile);
  return NextResponse.json({ success: true, data: updated });
}


// DELETE: Delete a template by id
export async function DELETE(req: NextRequest) {
  // Get the id from the query string
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }
  await admissionYearService.deleteIdCardTemplate(Number(id));
  return NextResponse.json({ success: true });
} 