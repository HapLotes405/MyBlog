/**
 * Janus Labyrinth — ported from Python pymunk version
 * - Matter.js handles all real collision physics (restitution, friction) during world.step()
 * - _collide = exact port of Python _collision_safety (maze_system.py:236-290)
 *   Position push with margin + cancel inward velocity. Pure penetration recovery.
 */
const X=640,Y=350;

const LV={
    fixedBaffles:[[698,153,697,280],[453,155,562,156],[838,155,712,156],[436,156,439,549],[578,162,578,370],[838,170,838,557],[694,372,590,373],[577,462,698,463],[696,469,697,547],[825,558,436,558]],
    movingTrajs:[[506,233,463],[765,231,467]],mHalfW:50,thick:4,epR:6,
    tracks:[[0,640,580,778],[1280,640,700,778]],
    pX:640,pY:780,pW:280,pH:16,
    bX:0,bY:160,bR:28.125,bM:5.0,
    // pymunk: ball restitution 0.15, baffle restitution 0.3 → product e=0.045
    ballRest:0.15,baffleRest:0.3,ballFric:0.15,baffleFric:0.3,platFric:1.5,
    grav:35.7,rotSpd:0.65,maxRot:2*Math.PI,
};
// e=1 for perfectly elastic (energy+momentum conserved)

class Rot {
    constructor(){this.a=0;this.v=0;this.mv=0.65;this.ma=2*Math.PI;this.at=0.25;this.st="idle";this.tm=0;this.nx="accel_ccw";}
    reset(){this.a=0;this.v=0;this.st="idle";this.tm=0;}
    press(){const p=this.st;if(this.st==="idle"&&this.a>-this.ma+0.001)this.st="accel_cw";else if(this.st==="accel_ccw"||this.st==="const_ccw"){this.st="decel";this.nx="accel_cw";}else if(this.st==="decel"&&this.nx!=="accel_cw")this.nx="accel_cw";if(this.st!==p)this.tm=0;}
    release(){const p=this.st;if((this.st==="accel_cw"||this.st==="const_cw")&&this.a<-0.001){this.st="decel";this.nx="accel_ccw";}else if(this.st==="idle"&&this.a<-0.001)this.st="accel_ccw";else if(this.st==="decel"&&this.nx!=="accel_ccw")this.nx="accel_ccw";if(this.st!==p)this.tm=0;}
    update(dt){if(this.st==="idle")return;this.tm+=dt;if(this.st==="accel_ccw"){const t=Math.min(this.tm/this.at,1);this.v=this.mv*t;this._up(dt);if(t>=1&&this.st==="accel_ccw"){this.st="const_ccw";this.v=this.mv;}}else if(this.st==="const_ccw")this._up(dt);else if(this.st==="decel"){const sv=Math.abs(this.v),t=Math.min(this.tm/this.at,1),d=this.v>0?1:-1;this.v=d*sv*(1-t);this._up(dt);if(t>=1){this.v=0;if(this.a<-0.001||this.a>0.001){this.st=this.nx;this.tm=0;}else this.st="idle";}}else if(this.st==="accel_cw"){const t=Math.min(this.tm/this.at,1);this.v=-this.mv*t;this._up(dt);if(t>=1&&this.st==="accel_cw"){this.st="const_cw";this.v=-this.mv;}}else if(this.st==="const_cw")this._up(dt);}
    _up(dt){this.a+=this.v*dt;if(this.a<=-this.ma&&this.v<0){this.a=-this.ma;this.v=0;this.st="idle";}if(this.a>=0&&this.v>0&&(this.st==="accel_ccw"||this.st==="const_ccw")){this.a=0;this.v=0;this.st="idle";}}
}

class Boot extends Phaser.Scene {
    constructor(){super('Boot');}
    preload(){const w=this.cameras.main.width,h=this.cameras.main.height,bar=this.add.graphics(),box=this.add.graphics();box.fillStyle(0x222233,0.8);box.fillRoundedRect(w/2-160,h/2-25,320,50,10);this.load.on('progress',v=>{bar.clear();bar.fillStyle(0xffd700,1);bar.fillRoundedRect(w/2-150,h/2-15,300*v,30,6);});this.load.on('complete',()=>{bar.destroy();box.destroy();});this.load.image('bg','janusmaze.jpg');}
    create(){this.scene.start('Game');}
}

class Game extends Phaser.Scene {
    constructor(){super('Game');}
    create(){
        this._M=Phaser.Physics.Matter.Matter;
        this.t=0;this.paused=false;this.won=false;this.stab=0;this.sp=false;this.pa=0;this.ca=0;this.onP=false;
        this.rs=new Rot();this.rs.mv=LV.rotSpd;this.rs.ma=LV.maxRot;
        this.ball=null;this.plat=null;this.fixed=[];this.moving=[];this.tracks=[];
        this.add.image(640,400,'bg').setDisplaySize(1280,800);
        this.bgfx=this.add.graphics();this.ggfx=this.add.graphics();
        this.sk=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.rk=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.input.on('pointerdown',p=>{if(p.y>60){this.sp=true;this.rs.press();}});
        this.input.on('pointerup',()=>{this.sp=false;this.rs.release();});
        const eng=this.matter.world.engine;
        eng.positionIterations=60;eng.velocityIterations=60;
        this.matter.world.setGravity(0,10);
        this.matter.world.autoUpdate=false;
        this.matter.world.on('collisionstart',ev=>{for(const p of ev.pairs){const a=p.bodyA.label,b=p.bodyB.label;if((a==='ball'&&b==='plat')||(b==='ball'&&a==='plat'))this.onP=true;}});
        this.matter.world.on('collisionend',ev=>{for(const p of ev.pairs){const a=p.bodyA.label,b=p.bodyB.label;if((a==='ball'&&b==='plat')||(b==='ball'&&a==='plat'))this.onP=false;}});
        this._load();
    }

    _load(){
        this._clear();const M=this._M,w=this.matter.world.engine.world;
        this.t=0;this.paused=false;this.won=false;this.stab=0;this.onP=false;this.pa=0;this.ca=0;
        this.rs.reset();this.rs.mv=LV.rotSpd;this.rs.ma=LV.maxRot;this.sp=false;

        this.plat=M.Bodies.rectangle(LV.pX,LV.pY,LV.pW,LV.pH,{isStatic:true,label:'plat',friction:LV.platFric,restitution:0.02});
        M.Composite.add(w,this.plat);
        this.ball=M.Bodies.circle(X+LV.bX,Y+LV.bY,LV.bR,{label:'ball',restitution:0.02,friction:0.5,density:LV.bM/(Math.PI*LV.bR*LV.bR)});
        M.Composite.add(w,this.ball);
        this.fixed=[];
        for(const[wx1,wy1,wx2,wy2] of LV.fixedBaffles){
            const lx1=wx1-X,ly1=wy1-Y,lx2=wx2-X,ly2=wy2-Y,mx=(lx1+lx2)/2,my=(ly1+ly2)/2,dx=lx2-lx1,dy=ly2-ly1,len=Math.sqrt(dx*dx+dy*dy),la=Math.atan2(dy,dx);
            const body=M.Bodies.rectangle(X+mx,Y+my,len,LV.thick,{isStatic:true,angle:la,label:'baffle',friction:0.3,restitution:0.3});
            M.Composite.add(w,body);this.fixed.push({body,lx1,ly1,lx2,ly2,mx,my,la,len});
        }
        this.moving=[];
        for(const[tx,ty1,ty2] of LV.movingTrajs){
            const lx=tx-X,cy=(ty1+ty2)/2,hw=LV.mHalfW;
            const body=M.Bodies.rectangle(X+lx,cy,hw*2,LV.thick,{isStatic:true,angle:0,label:'baffle',friction:0.3,restitution:0.3});
            M.Composite.add(w,body);this.moving.push({body,lx,wy1:ty1,wy2:ty2,cy,dir:1,hw});
        }
        this.tracks=[];
        for(const[tx1,ty1,tx2,ty2] of LV.tracks){const mx=(tx1+tx2)/2,my=(ty1+ty2)/2,dx=tx2-tx1,dy=ty2-ty1;const body=M.Bodies.rectangle(mx,my,Math.sqrt(dx*dx+dy*dy),10,{isStatic:true,angle:Math.atan2(dy,dx),label:'plat',friction:0.5,restitution:0.3});M.Composite.add(w,body);this.tracks.push(body);}
    }

    _clear(){const M=this._M,w=this.matter.world.engine.world,R=b=>{if(b)M.Composite.remove(w,b);};R(this.ball);this.ball=null;R(this.plat);this.plat=null;for(const d of this.fixed)R(d.body);for(const d of this.moving)R(d.body);for(const b of this.tracks)R(b);this.fixed=[];this.moving=[];this.tracks=[];}

    update(time,delta){
        const dt=delta/1000;
        this._inp();this.rs.update(dt);if(!this.paused&&!this.won)this.t+=dt;
        const ca=this.rs.a,pa=this.pa;this.pa=ca;this.ca=ca;
        // Moving baffles: independent velocity, sync by matching speed (90 px/s)
        for(const d of this.moving){let ny=d.cy+90*dt*d.dir;if(ny>d.wy2){ny=d.wy2;d.dir=-1;}else if(ny<d.wy1){ny=d.wy1;d.dir=1;}d.cy=ny;}
        const sdt=delta/48,da=ca-pa,pz=!this.won&&!this.paused;
        if(pz)this._collide(pa);
        for(let i=0;i<48;i++){const a=pa+da*(i+1)/48;this._pose(a);this.matter.world.step(sdt);}
        if(pz)this._collide(ca);
        if(this.ball){const v=this.ball.velocity;let vx=v.x,vy=v.y,c=false;if(Math.abs(vx)>10){vx=Math.sign(vx)*10;c=true;}if(Math.abs(vy)>10){vy=Math.sign(vy)*10;c=true;}if(c)this._M.Body.setVelocity(this.ball,{x:vx,y:vy});}
        if(!this.won&&!this.paused)this._vic(dt);
        this._drwBaf();this._drwBal();
    }

    _inp(){const k=this.sk.isDown;if(k&&!this.sp){this.sp=true;this.rs.press();}else if(!k&&this.sp){this.sp=false;this.rs.release();}if(Phaser.Input.Keyboard.JustDown(this.rk))this._load();}

    _pose(a){const B=this._M.Body,ca=Math.cos(a),sa=Math.sin(a);
        for(const d of this.fixed){const wx=X+d.mx*ca-d.my*sa,wy=Y+d.mx*sa+d.my*ca;B.setPosition(d.body,{x:wx,y:wy});B.setAngle(d.body,d.la+a);}
        for(const d of this.moving){const ly=d.cy-Y;B.setPosition(d.body,{x:X+d.lx*ca-ly*sa,y:Y+d.lx*sa+ly*ca});B.setAngle(d.body,a);}
    }

    // ================================================================
    // Exact port of Python _collision_safety (maze_system.py:236-290)
    // Pure penetration recovery — real collision physics handled by Matter.js.
    // - Position: push out of overlap with margin = max(thickness, 3) = 4
    // - Velocity: cancel inward normal component (vel_into < 0 → bv - n*vel_into)
    // - Per segment: check body + endpoints; deepest overlap → single push + velocity fix
    // - Uses LOCAL COPY of position (primitives) — no double-push
    // ================================================================
    _collide(a){if(!this.ball)return;const B=this._M.Body,br=LV.bR,er=LV.epR,bt=LV.thick,minDist=br+er,pushMargin=Math.max(bt,3),velEps=3,ca=Math.cos(a),sa=Math.sin(a),sg=this._segs(ca,sa);
        let bpx=this.ball.position.x,bpy=this.ball.position.y; // local copy — Python: bp = bp + normal * penetration
        for(let it=0;it<5;it++){let resolved=false;
            for(const s of sg){
                const dx=s.x2-s.x1,dy=s.y2-s.y1,ls=dx*dx+dy*dy;let cl;
                if(ls<0.01)cl={x:s.x1,y:s.y1};
                else{const t=Math.max(0,Math.min(1,((bpx-s.x1)*dx+(bpy-s.y1)*dy)/ls));cl={x:s.x1+t*dx,y:s.y1+t*dy};}
                // Segment body check
                const dvx=bpx-cl.x,dvy=bpy-cl.y,dist=Math.sqrt(dvx*dvx+dvy*dvy);
                if(dist<br&&dist>0.001){
                    const nx=dvx/dist,ny=dvy/dist,pen=br-dist+pushMargin;
                    bpx+=nx*pen;bpy+=ny*pen;B.setPosition(this.ball,{x:bpx,y:bpy});
                    const bv=this.ball.velocity;if(bv){const vi=bv.x*nx+bv.y*ny;
                        if(vi<-velEps)B.setVelocity(this.ball,{x:bv.x-nx*vi,y:bv.y-ny*vi});
                        else if(vi<0)B.setVelocity(this.ball,{x:bv.x-nx*vi,y:bv.y-ny*vi});}
                    resolved=true;}
                // Endpoint checks
                for(const pt of[{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}]){
                    const ex=bpx-pt.x,ey=bpy-pt.y,d=Math.sqrt(ex*ex+ey*ey);
                    if(d<minDist&&d>0.001){
                        const nx=ex/d,ny=ey/d,pen=minDist-d+pushMargin;
                        bpx+=nx*pen;bpy+=ny*pen;B.setPosition(this.ball,{x:bpx,y:bpy});
                        const bv=this.ball.velocity;if(bv){const vi=bv.x*nx+bv.y*ny;
                            if(vi<-velEps)B.setVelocity(this.ball,{x:bv.x-nx*vi,y:bv.y-ny*vi});
                            else if(vi<0)B.setVelocity(this.ball,{x:bv.x-nx*vi,y:bv.y-ny*vi});}
                        resolved=true;}}}
            if(!resolved)break;}
    }

    _segs(ca,sa){const s=[];for(const d of this.fixed)s.push({x1:X+d.lx1*ca-d.ly1*sa,y1:Y+d.lx1*sa+d.ly1*ca,x2:X+d.lx2*ca-d.ly2*sa,y2:Y+d.lx2*sa+d.ly2*ca,tp:'f'});for(const d of this.moving){const ly=d.cy-Y,lx=d.lx,hw=d.hw;s.push({x1:X+(lx-hw)*ca-ly*sa,y1:Y+(lx-hw)*sa+ly*ca,x2:X+(lx+hw)*ca-ly*sa,y2:Y+(lx+hw)*sa+ly*ca,tp:'m',dir:d.dir});}return s;}

    _vic(dt){if(!this.ball)return;const bp=this.ball.position,bv=this.ball.velocity,sp=Math.sqrt(bv.x*bv.x+bv.y*bv.y),hw=LV.pW/2,hh=LV.pH/2,br=LV.bR,on=this.onP||(Math.abs(bp.x-LV.pX)<hw+br&&Math.abs(bp.y-LV.pY)<hh+br),rest=on&&(sp<8||bp.y>LV.pY+hh);if(rest){this.stab+=dt;if(this.stab>=0.3)this._win();}else if(!on)this.stab=0;}
    _win(){if(this.won)return;this.won=true;}

    _drwBaf(){const g=this.bgfx;g.clear();const ca=Math.cos(this.ca),sa=Math.sin(this.ca);for(const s of this._segs(ca,sa)){g.lineStyle(6,0xc8a000,1);g.beginPath();g.moveTo(s.x1,s.y1);g.lineTo(s.x2,s.y2);g.strokePath();g.lineStyle(4,0xffd700,1);g.beginPath();g.moveTo(s.x1,s.y1);g.lineTo(s.x2,s.y2);g.strokePath();g.lineStyle(1.5,0xfff08c,0.7);g.beginPath();g.moveTo(s.x1,s.y1);g.lineTo(s.x2,s.y2);g.strokePath();for(const e of[{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}]){g.fillStyle(0xffd700,1);g.fillCircle(e.x,e.y,5);g.fillStyle(0xfff08c,1);g.fillCircle(e.x,e.y,3);}}}
    _drwBal(){const g=this.ggfx;g.clear();if(!this.ball)return;const x=this.ball.position.x,y=this.ball.position.y,r=LV.bR;g.fillStyle(0x64b4ff,1);g.fillCircle(x,y,r);g.lineStyle(2,0x96d2ff,1);g.strokeCircle(x,y,r);g.fillStyle(0xc8e1ff,0.6);g.fillCircle(x-r*.3,y-r*.3,r*.3);}
}

new Phaser.Game({type:Phaser.AUTO,width:1280,height:800,backgroundColor:'#0a0f19',parent:'game-container',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'matter',matter:{gravity:{x:0,y:0},debug:false}},scene:[Boot,Game]});
