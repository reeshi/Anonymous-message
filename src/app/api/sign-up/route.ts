import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";

// in nextjs this is the way to write the controller function we specify whether it is post or get or patch.
export async function POST(request: Request) {
    // inside every api we need a db connection bcoz next.js runs on edge network.
    await dbConnect();

    try {
        const { email, username, password } = await request.json();

        // check whether a verified user has already taken this username
        const existingUserVerifiedByUsername = await UserModel.findOne({
            username: username,
            isVerified: true
        })

        if (existingUserVerifiedByUsername) {
            return Response.json(
                {
                    success: false,
                    message: "Username already taken"
                },
                {
                    status: 400
                }
            )
        }

        // check whether a email is already exist
        const existingUserByEmail = await UserModel.findOne({ email: email });
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

        if (existingUserByEmail) {
            // check whether the existing user is already verified.
            if (existingUserByEmail.isVerified) {
                return Response.json(
                    {
                        success: false,
                        message: "User already exist with the email"
                    },
                    {
                        status: 400
                    }
                )
            } else {
                // if user not verified then we override the previous data with the new data and again send the code.
                const hashPassword = await bcrypt.hash(password, 10);
                existingUserByEmail.password = hashPassword;
                existingUserByEmail.verifyCode = verifyCode;
                existingUserByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000);

                await existingUserByEmail.save();
            }
        } else {
            const hashPassword = await bcrypt.hash(password, 10);
            // set the expiry of the code
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 1);

            const newUser = new UserModel({
                username,
                email,
                password: hashPassword,
                verifyCode,
                verifyCodeExpiry: expiryDate,
                isVerified: false,
                isAcceptingMessage: true,
                messages: []
            })

            await newUser.save();
        }

        // send the verification email
        const emailResponse = await sendVerificationEmail(
            email,
            username,
            verifyCode
        )

        if (!emailResponse.success) {
            return Response.json(
                {
                    success: false,
                    message: emailResponse.message
                },
                {
                    status: 500
                }
            )
        }

        return Response.json(
            {
                success: true,
                message: "User registered successfully. Please verify your email"
            },
            {
                status: 201
            }
        )

    } catch (error) {
        console.error("Error registering user", error);
        return Response.json(
            {
                success: false,
                message: "Error registering user"
            },
            {
                status: 500
            }
        )
    }
}
