const loginButton =
    document.getElementById("login-button");
    
if (loginButton) {

    const SUPABASE_URL = "https://agyejnzrvucglgqqhlzv.supabase.co";
    const SUPABASE_KEY = "sb_publishable_UDf_B-K_mE73MwHZmWNofw_1jTuF3fS";

    const supabaseClient = supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    const logoutButton =
        document.getElementById("logout-button");

    const loginMessage =
        document.getElementById("login-message");

    const loginSection =
        document.getElementById("quiz-login");

    const dashboard =
        document.getElementById("quiz-dashboard");


    // Log in
    loginButton.addEventListener("click", async () => {

        const email =
            document.getElementById("login-email").value;

        const password =
            document.getElementById("login-password").value;

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {

            loginMessage.textContent =
                error.message;
                // "Login failed.";

            console.error(error);

            return;
        }

        loginSection.style.display = "none";
        dashboard.style.display = "block";

        await loadQuizResults();

    });


    // Log out
    logoutButton.addEventListener("click", async () => {

        await supabaseClient.auth.signOut();

        dashboard.style.display = "none";
        loginSection.style.display = "block";

    });
    
    async function loadQuizResults() {

        const {
            data: { user }
        } = await supabaseClient.auth.getUser();

        if (!user) {
            return;
        }

        const { data, error } = await supabaseClient
            .from("quiz_attempts")
            .select("*")
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false });

        if (error) {

            console.error(
                "Error loading quiz results:",
                error
            );

            return;
        }

        const resultsContainer =
            document.getElementById("quiz-results");

        resultsContainer.innerHTML = "";

        data.forEach((attempt) => {

            const attemptElement =
                document.createElement("div");

            attemptElement.innerHTML = `
                <h3>${attempt.quiz_id}</h3>
                <p>
                    Score: ${attempt.score} / ${attempt.total_questions}
                </p>
                <p>
                    Completed: ${new Date(attempt.completed_at).toLocaleString()}
                </p>
            `;

            resultsContainer.appendChild(attemptElement);

        });
    }

}