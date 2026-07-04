import { NextRequest, NextResponse } from 'next/server'

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const otp = generateOTP()

    // In production with Twilio configured:
    // const accountSid = process.env.TWILIO_ACCOUNT_SID
    // const authToken = process.env.TWILIO_AUTH_TOKEN
    // const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
    // const client = twilio(accountSid, authToken)
    // await client.messages.create({
    //   body: `Your সহজ (Sohoj) verification code is: ${otp}`,
    //   from: twilioPhoneNumber,
    //   to: phoneNumber,
    // })

    // For demo: Log OTP (in production, never expose OTP in response)
    console.log(`[v0] OTP for ${phoneNumber}: ${otp}`)

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent successfully (demo mode)',
        otp: otp, // Demo only - remove in production!
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] OTP send error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
