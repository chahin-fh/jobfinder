import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;
	const { email, password, name } = await event.request.json();

	if (!email || !password || !name) {
		return json({ error: 'Name, email, and password are required' }, { status: 400 });
	}

	const { data: authData, error: authError } = await supabase.auth.signUp({
		email,
		password,
		options: { data: { name } }
	});

	if (authError) {
		return json({ error: authError.message }, { status: 400 });
	}

	return json({ user: authData.user });
}
