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
  const givenTemplate: any = {};
  for (const [key, value] of formData.entries()) {
    if ([
      'nameCoordinates',
      'courseCoordinates',
      'uidCoordinates',
      'mobileCoordinates',
      'bloodGroupCoordinates',
      'sportsQuotaCoordinates',
      'qrcodeCoordinates',
      'validTillDateCoordinates',
      'photoDimension'
    ].includes(key)) {
      givenTemplate[key] = value ? JSON.parse(value as string) : undefined;
    } else if (key === 'qrcodeSize') {
      givenTemplate[key] = Number(value);
    } else if (key === 'disabled') {
      givenTemplate[key] = value === 'true' || value === '1';
    } else if (key !== 'templateFile') {
      givenTemplate[key] = value;
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
  const defaultValues: Record<string, any> = {
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
    if (!givenTemplate[key]) {
      givenTemplate[key] = defaultValues[key];
    }
  }
  const templateFile = formData.get('templateFile');
  const created = await admissionYearService.createIdCardTemplate(givenTemplate, templateFile instanceof File ? templateFile : undefined);
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
  const { id } = await req.json();
  await admissionYearService.deleteIdCardTemplate(id);
  return NextResponse.json({ success: true });
} 