const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Clio webhooks send data using standard HTTP POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Webhooks require POST.' });
  }

  try {
    const { data, event } = req.body;
    
    console.log(`WorkTimeline Webhook Listener | Caught Clio Event: [${event}]`);

    let milestoneTitle = "";
    let milestoneDesc = "";

    // Parse the Clio event type to dynamically format the milestone text
    switch (event) {
      case 'tasks.completed':
        milestoneTitle = `Task Completed: ${data.name || 'Legal Milestone reached'}`;
        milestoneDesc = `Your legal team completed an internal milestone task: "${data.description || 'Case processing step verified.'}"`;
        break;

      case 'matters.updated':
        milestoneTitle = `Case Status Synchronized`;
        milestoneDesc = `The primary matter file status was updated inside Clio to: "${data.status || 'Active Review'}".`;
        break;

      case 'communications.created':
        milestoneTitle = `Official Communication Logged`;
        milestoneDesc = `A new document message or formal communication record was successfully processed into your case timeline database file.`;
        break;

      default:
        // Ignore unmapped background events quietly so Clio doesn't keep retrying
        return res.status(200).json({ received: true, message: 'Unhandled event bypassed.' });
    }

    // Insert the automated Clio milestone update right into your Supabase table rows
    const { error: dbError } = await supabase
      .from('worktimeline_milestones')
      .insert([
        {
          firm_row_id: 1, // Connects to your standard seed reference tracking row configuration
          logged_by: 'automated_clio',
          title: milestoneTitle,
          description: milestoneDesc,
          is_visible_to_client: true
        }
      ]);

    if (dbError) {
      console.error("Database Injection Error handling Clio Webhook payload data:", dbError);
      throw dbError;
    }

    // Respond back to Clio with a clean 200 OK so it knows the transaction succeeded
    return res.status(200).json({ success: true, message: 'Timeline successfully updated via Clio.' });

  } catch (err) {
    console.error('WorkTimeline Webhook Core System Fault Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
