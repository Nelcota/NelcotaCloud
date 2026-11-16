/// An email ready to send, with a plain-text and an HTML version of the same message.
pub struct OutgoingEmail {
    pub to: String,
    pub subject: String,
    pub text_body: String,
    pub html_body: String,
}
