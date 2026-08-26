import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	const supabase = event.locals.supabase;
	const { email, password } = await event.request.json();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (error) {
		return json({ error: error.message }, { status: 401 });
	}

	return json({ user: data.user, session: data.session });
}
