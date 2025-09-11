"use strict";(()=>{var e={};e.id=1889,e.ids=[1889],e.modules={53524:e=>{e.exports=require("@prisma/client")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},14300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},12781:e=>{e.exports=require("stream")},73837:e=>{e.exports=require("util")},70210:(e,n,t)=>{t.r(n),t.d(n,{originalPathname:()=>v,patchFetch:()=>h,requestAsyncStorage:()=>u,routeModule:()=>p,serverHooks:()=>m,staticGenerationAsyncStorage:()=>f});var s={};t.r(s),t.d(s,{GET:()=>l});var a=t(49303),r=t(88716),o=t(60670),i=t(87070),d=t(13538),c=t(2095);async function l(e,{params:n}){try{let t=await (0,c.mk)(e);if(t.error)return t.error;let s=new URL(e.url).searchParams.get("format")||"json",a=await d._.transaction.findFirst({where:{id:n.id,userId:t.user.userId},include:{paymentMethod:{select:{id:!0,type:!0,provider:!0,details:!0}},user:{select:{id:!0,email:!0,name:!0}}}});if(!a)return(0,c.jl)("Transaction not found",404);if(!["completed","refunded"].includes(a.status))return(0,c.jl)("Receipt only available for completed or refunded transactions",400);let r=(a.metadata||{}).refund,o={receiptId:`RCP-${a.id.slice(-8).toUpperCase()}`,transactionId:a.id,date:a.completedAt||a.createdAt,customer:{name:a.user.name||"N/A",email:a.user.email},transaction:{amount:a.amount,currency:a.currency,description:a.description||"Payment",status:a.status,paymentMethod:{type:a.paymentMethod.type,provider:a.paymentMethod.provider,lastFour:function(e){if("object"==typeof e&&null!==e){if(e.cardNumber)return`****-${e.cardNumber.slice(-4)}`;if(e.accountNumber)return`****-${e.accountNumber.slice(-4)}`;if(e.walletAddress)return`${e.walletAddress.slice(0,6)}...${e.walletAddress.slice(-4)}`}return"****"}(a.paymentMethod.details)}},...r&&{refund:{amount:r.refundAmount,reason:r.reason,processedAt:r.refundedAt}},businessInfo:{name:"FacePay",address:"123 Payment Street, Fintech City, FC 12345",taxId:"TAX123456789",support:"support@facepay.com"},generated:new Date().toISOString()};switch(s.toLowerCase()){case"html":return new i.NextResponse(function(e){let n="refunded"===e.transaction.status;return`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${e.receiptId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .receipt {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .section h2 {
            color: #4a5568;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: 600;
            color: #4a5568;
        }
        .info-value {
            color: #2d3748;
        }
        .amount {
            font-size: 24px;
            font-weight: bold;
            color: #2b6cb0;
        }
        .status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.completed {
            background: #c6f6d5;
            color: #22543d;
        }
        .status.refunded {
            background: #fed7d7;
            color: #c53030;
        }
        .footer {
            background: #f7fafc;
            padding: 20px 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .refund-notice {
            background: #fef5e7;
            border-left: 4px solid #f6ad55;
            padding: 15px;
            margin-bottom: 20px;
        }
        @media print {
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h1>${e.businessInfo.name}</h1>
            <p>Receipt #${e.receiptId}</p>
        </div>
        
        <div class="content">
            ${n?`
            <div class="refund-notice">
                <strong>⚠️ REFUNDED TRANSACTION</strong><br>
                This transaction has been refunded. See refund details below.
            </div>
            `:""}
            
            <div class="section">
                <h2>Transaction Details</h2>
                <div class="info-row">
                    <span class="info-label">Transaction ID:</span>
                    <span class="info-value">${e.transactionId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${new Date(e.date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="status ${e.transaction.status}">${e.transaction.status}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Description:</span>
                    <span class="info-value">${e.transaction.description}</span>
                </div>
            </div>

            <div class="section">
                <h2>Payment Information</h2>
                <div class="info-row">
                    <span class="info-label">Amount:</span>
                    <span class="info-value amount">${e.transaction.currency} ${e.transaction.amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Payment Method:</span>
                    <span class="info-value">${e.transaction.paymentMethod.type.toUpperCase()} (${e.transaction.paymentMethod.provider})</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Card/Account:</span>
                    <span class="info-value">${e.transaction.paymentMethod.lastFour}</span>
                </div>
            </div>

            <div class="section">
                <h2>Customer Information</h2>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${e.customer.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${e.customer.email}</span>
                </div>
            </div>

            ${e.refund?`
            <div class="section">
                <h2>Refund Information</h2>
                <div class="info-row">
                    <span class="info-label">Refund Amount:</span>
                    <span class="info-value amount">${e.transaction.currency} ${e.refund.amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Reason:</span>
                    <span class="info-value">${e.refund.reason}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Processed:</span>
                    <span class="info-value">${new Date(e.refund.processedAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
            </div>
            `:""}
        </div>

        <div class="footer">
            <p><strong>${e.businessInfo.name}</strong></p>
            <p>${e.businessInfo.address}</p>
            <p>Tax ID: ${e.businessInfo.taxId}</p>
            <p>Support: ${e.businessInfo.support}</p>
            <p style="margin-top: 15px; font-size: 12px;">Generated on ${new Date(e.generated).toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
  `}(o),{headers:{"Content-Type":"text/html","Content-Disposition":`inline; filename="receipt-${o.receiptId}.html"`}});case"pdf":return(0,c.jl)("PDF generation not implemented yet. Use format=html or format=json",501);default:return(0,c.x_)(o)}}catch(e){return console.error("Generate receipt error:",e),(0,c.jl)("Internal server error",500)}}let p=new a.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/transactions/[id]/receipt/route",pathname:"/api/transactions/[id]/receipt",filename:"route",bundlePath:"app/api/transactions/[id]/receipt/route"},resolvedPagePath:"/Users/davicho/MASTER proyectos/FacePay/src/app/api/transactions/[id]/receipt/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:u,staticGenerationAsyncStorage:f,serverHooks:m}=p,v="/api/transactions/[id]/receipt/route";function h(){return(0,o.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:f})}},2095:(e,n,t)=>{t.d(n,{jl:()=>i,mk:()=>o,x_:()=>d});var s=t(87070),a=t(75183),r=t(13538);async function o(e){let n=e.headers.get("authorization"),t=(0,a.oA)(n);if(!t)return{user:null,error:s.NextResponse.json({success:!1,error:"Authorization token required"},{status:401})};let o=(0,a.ez)(t);return o?await r._.user.findUnique({where:{id:o.userId}})?{user:o,error:null}:{user:null,error:s.NextResponse.json({success:!1,error:"User not found"},{status:401})}:{user:null,error:s.NextResponse.json({success:!1,error:"Invalid or expired token"},{status:401})}}function i(e,n=400){return s.NextResponse.json({success:!1,error:e},{status:n})}function d(e,n){return s.NextResponse.json({success:!0,data:e,message:n})}},75183:(e,n,t)=>{t.d(n,{X8:()=>i,ez:()=>d,oA:()=>l,si:()=>c});var s=t(41482),a=t.n(s);let r=process.env.JWT_SECRET||"your-secret-key",o=process.env.JWT_REFRESH_SECRET||"your-refresh-secret-key";function i(e){let n={userId:e.id,email:e.email};return{accessToken:a().sign(n,r,{expiresIn:"15m"}),refreshToken:a().sign(n,o,{expiresIn:"7d"}),expiresIn:900}}function d(e){try{return a().verify(e,r)}catch(e){return null}}function c(e){try{return a().verify(e,o)}catch(e){return null}}function l(e){return e&&e.startsWith("Bearer ")?e.substring(7):null}},13538:(e,n,t)=>{t.d(n,{_:()=>r});var s=t(53524);let a=globalThis,r=a.prisma??=new s.PrismaClient({log:["query"]})}};var n=require("../../../../../webpack-runtime.js");n.C(e);var t=e=>n(n.s=e),s=n.X(0,[8948,5972,1482],()=>t(70210));module.exports=s})();