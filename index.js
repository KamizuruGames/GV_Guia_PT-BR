const mapID = [3101, 3201];					// MAP ID to input [ Normal Mode , Hard Mode ]
const MarkerItem = 553;

const FirstBossActions = {
	119: {msg: 'ATRAS + FRENTE (LENTO)'},
	139: {msg: 'ATRAS + FRENTE (RAPIDO)'},
	313: {msg: 'CIRCULOS (LENTO)', mark_interval: 10, mark_distance: 300, mark_shift_distance: 75},
	314: {msg: 'CIRCULOS (RAPIDO)', mark_interval: 10, mark_distance: 300, mark_shift_distance: 75},
	113: {msg: 'PULO (LENTO)'},
	133: {msg: 'PULO (RAPIDO)'},
	118: {msg: 'PULO P (LENTO)'},
	138: {msg: 'PULO P (RAPIDO)'},
	111: {msg: 'SPRAY ATRAS (LENTO)'},
	131: {msg: 'SPRAY ATRAS (RAPIDO)'},
	305: {msg: 'PIZZA'}
};

const SecondBossActions = {
	231: {msg: 'FORA SEGURO', mark_interval: 10, mark_distance: 300},
	232: {msg: 'DENTRO SEGURO', mark_interval: 10, mark_distance: 300},
	108: {msg: 'ATAQUE ATRAS!'},
	235: {msg: 'DEBUFFS'},
	230: {msg: 'ATAQUE EM AREA'},
	228: {msg: 'ATAQUE EM EQUIPE'}
};

module.exports = function nest_guide(mod) {
	const command = mod.command;
	let hooks = [],
		bossCurLocation,
		bossCurAngle,
		uid0 = 999999999n,
		sendToParty = false,
		enabled = true,
		itemhelper = true,
	   	streamenabled = false;
	
	mod.hook('S_LOAD_TOPO', 3, (event) => {
		if (event.zone === mapID[0]) 
		{								
			command.message('Bem Vindo a Gossamer Vault - Normal Mode');
			load();
		} 
		else if (event.zone === mapID[1]) {
			command.message('Bem Vindo a Gossamer Vault - Hard Mode');
			load();
		}
		else
		{
			unload();
		}
    });
	
	command.add(['gv', '!gv'], {
        $none() {
            enabled = !enabled;
			command.message('Guia Gossamer Vault'+(enabled ? 'Ativado' : 'Desativado') + '.');
		},
		$default() {
			command.message('Error (Digite?) no comando! consulte README para obter a lista de comandos validos')
		},
		itemhelp() {
			itemhelper = !itemhelper;
			command.message('Indicador de locais seguros '+(itemhelper ? 'Ativado' : 'Desativado') + '.');
		},
		toparty(arg) {
			if(arg === "stream")
			{
				streamenabled = !streamenabled;
				sendToParty = false;
				itemhelper = false;
				command.message((streamenabled ? 'Stream mode Ativado' : 'Stream mode Desativado'));
			}
			else
			{
				streamenabled = false;
				sendToParty = !sendToParty;
				command.message((sendToParty ? 'Guia Gossamer Vault - As mensagens serao enviadas para a party' : 'Guia Gossamer Vault - Somente voce vera mensagens no chat'));
			}
		}
	});
	
	function sendMessage(msg)
	{
		if (sendToParty) 
		{
			mod.toServer('C_CHAT', 1, {
			channel: 21, //21 = p-notice, 1 = party, 2 = guild
			message: msg
			});
		}
		else if(streamenabled) 
		{
			command.message(msg);
		}
		else 
		{
			mod.toClient('S_CHAT', 3, {
			channel: 21, //21 = p-notice, 1 = party
			name: 'DG-Guide',
			message: msg
			});
		}
	}
	
	function Spawnitem(item, angle, radius, lifetime) {
		let r = null, rads = null, finalrad = null, pos = {};
		
		r = bossCurAngle - Math.PI;
		finalrad = r - angle;
		pos.x = bossCurLocation.x + radius * Math.cos(finalrad);
		pos.y = bossCurLocation.y + radius * Math.sin(finalrad);
		pos.z = bossCurLocation.z;
		
		mod.send('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : pos,
			w : r,
			unk1 : 0,
			unk2 : 0
		});
		
		setTimeout(Despawn, lifetime, uid0);
		uid0--;
	}
	
	function Despawn(uid_arg0) {
		mod.send('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}
	
	function SpawnitemCircle(item, intervalDegrees, radius, lifetime, shift_distance, shift_angle)
	{
		if(shift_angle)
		{
			bossCurAngle = (bossCurAngle - Math.PI) - (shift_angle * (Math.PI / 180));
		}
		if(shift_distance)
		{
			bossCurLocation.x = bossCurLocation.x + shift_distance * Math.cos(bossCurAngle);
			bossCurLocation.y = bossCurLocation.y + shift_distance * Math.sin(bossCurAngle);
		}
		for (var angle = -Math.PI; angle <= Math.PI; angle += Math.PI * intervalDegrees / 180)
		{
			Spawnitem(item, angle, radius, lifetime);
		}
	}
	
	function load()
	{
		if(!hooks.length)
		{
			hook('S_ACTION_STAGE', 9, (event) => {
				if(!enabled || event.stage != 0) return;
				
				if (event.templateId === 1000)
				{
					let skill = event.skill.id % 1000;
					if(FirstBossActions[skill])
					{
						sendMessage(FirstBossActions[skill].msg);
						if(itemhelper && FirstBossActions[skill].mark_interval !== undefined)
						{
							bossCurLocation = event.loc;
							bossCurAngle = event.w;
							SpawnitemCircle(MarkerItem, FirstBossActions[skill].mark_interval, FirstBossActions[skill].mark_distance, 4000, FirstBossActions[skill].mark_shift_distance)
						}
					}
				}
				else if (event.templateId === 2000)
				{
					let skill = event.skill.id % 1000;
					if(SecondBossActions[skill])
					{
						sendMessage(SecondBossActions[skill].msg);
						if(itemhelper && SecondBossActions[skill].mark_interval !== undefined)
						{
							bossCurLocation = event.loc;
							bossCurAngle = event.w;
							SpawnitemCircle(MarkerItem, SecondBossActions[skill].mark_interval, SecondBossActions[skill].mark_distance, 3000)
						}
					}
				}
			});
		}
	}
	
	function unload()
	{
		if(hooks.length)
		{
			for(let h of hooks) mod.unhook(h);

			hooks = []
		}
	}

	function hook()
	{
		hooks.push(mod.hook(...arguments));
	}
}
