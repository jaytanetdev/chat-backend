const { DataSource } = require('typeorm');
async function main() {
  const ds = new DataSource({
    type: 'postgres', host: '76.13.211.14', port: 5432,
    username: 'postgres', password: '123123@Jay', database: 'postgres',
  });
  await ds.initialize();

  const chats = await ds.query(
    "SELECT chat_id, message_type, message, metadata, external_message_id, create_at FROM chat ORDER BY create_at DESC LIMIT 8"
  );
  console.log('=== LATEST CHATS ===');
  chats.forEach(c => {
    console.log(`  ${c.create_at} | ${c.message_type} | ext_id=${c.external_message_id || 'NULL'} | meta=${JSON.stringify(c.metadata)} | msg=${c.message.substring(0,50)}`);
  });

  await ds.destroy();
}
main().catch(e => { console.error(e.message); process.exit(1); });
