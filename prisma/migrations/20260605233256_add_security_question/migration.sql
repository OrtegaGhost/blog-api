/*
  Warnings:

  - Added the required column `security_answer` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `security_question` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "security_answer" TEXT NOT NULL,
ADD COLUMN     "security_question" TEXT NOT NULL;
