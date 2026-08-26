import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const { error } = await supabase.auth.signOut();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
}
