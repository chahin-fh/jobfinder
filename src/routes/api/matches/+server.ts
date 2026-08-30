import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const supabase = event.locals.supabase;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { data, error } = await supabase
		.from('matches')
		.select('*, category:categories(*), client:profiles!client_id(id, name), freelancer:profiles!freelancer_id(id, name)')
		.or(`client_id.eq.${session.user.id},freelancer_id.eq.${session.user.id}`)
		.order('created_at', { ascending: false });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ matches: data });
}
