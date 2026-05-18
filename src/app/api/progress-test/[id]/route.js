import { NextResponse } from 'next/server';

export async function GET(request, context) {
  const id = (await Promise.resolve(context.params)).id;
  return NextResponse.json({ message: 'Progress test works', id });
}
