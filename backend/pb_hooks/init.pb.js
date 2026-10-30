onBootstrap((e) => {
  e.next()
  let guests
  try { guests = $app.findCollectionByNameOrId('moussiqa_guests') }
  catch (_) {
    guests = new Collection({name:'moussiqa_guests',type:'auth',createRule:'',listRule:null,viewRule:null,updateRule:null,deleteRule:null,passwordAuth:{enabled:true,identityFields:['email']}})
    $app.save(guests)
  }
  try { $app.findCollectionByNameOrId('moussiqa_snapshots'); return } catch (_) {}
  const ownerRule = '@request.auth.collectionName = "moussiqa_guests" && owner = @request.auth.id'
  $app.save(new Collection({
    name:'moussiqa_snapshots',type:'base',
    listRule:ownerRule,viewRule:ownerRule,deleteRule:ownerRule,
    createRule:'@request.auth.collectionName = "moussiqa_guests" && @request.body.owner = @request.auth.id',
    updateRule:ownerRule+' && @request.body.owner:changed = false',
    fields:[{name:'owner',type:'relation',required:true,maxSelect:1,collectionId:guests.id,cascadeDelete:true},{name:'payload',type:'json',required:true,maxSize:1048576}],
    indexes:['CREATE UNIQUE INDEX idx_moussiqa_snapshot_owner ON moussiqa_snapshots (owner)']
  }))
})
