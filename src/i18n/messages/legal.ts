import { defineMessages } from '../types'

type Section = { heading: string; body: string }

/**
 * Terms and Privacy text. `{repo}` in a body marks where the project-repository link goes.
 * The Cebuano version is a translation for readability; the English text is the reference.
 */
export const legal = defineMessages(
  {
    backToSignUp: 'Back to sign up',
    repository: 'project repository',
    referenceNote: '',
    terms: {
      title: 'Terms of Use',
      sections: [
        {
          heading: 'Acceptance',
          body: 'By creating an account or using Laag ta bAI you agree to these terms. If you do not agree, do not use the app.',
        },
        {
          heading: 'Your account and eligibility',
          body: 'You must be 18 years of age or older to register and create an account. You are responsible for the information you provide at sign-up and for keeping your credentials secure. Tell us if you believe your account has been accessed by someone else.',
        },
        {
          heading: 'Acceptable use',
          body: 'Use the app for personal travel and learning. Do not attempt to disrupt the service, misuse the AI guide, or submit content you do not have the right to share.',
        },
        {
          heading: 'AI-generated content',
          body: 'Landmark stories and AI answers are generated and may be incomplete or inaccurate. Verify important details (opening hours, fees, safety) with official sources before you travel.',
        },
        {
          heading: 'Educational project',
          body: 'Laag ta bAI is a student project provided "as is", without warranties. To the extent permitted by law, the team is not liable for decisions made using the app.',
        },
        { heading: 'Questions', body: 'Open an issue in the {repo} and we will respond.' },
      ] as Section[],
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: 'What we collect',
          body: 'Account details you enter at sign-up (name, email, nationality and optional bio), your progress such as XP, streaks and quest completions, and the landmarks you save for offline reading.',
        },
        {
          heading: 'Age requirement and date of birth',
          body: 'You must be 18 or older to register. In accordance with the Data Privacy Act proportionality principle, date of birth is collected solely to verify you meet the 18+ age requirement and is not stored or sent to our servers.',
        },
        {
          heading: 'Location and camera',
          body: 'We use your location to show your position on the Explore map, sort nearby landmarks, and verify scans. The map draws your precise location pin in your browser. Google Maps receives the map area you view, which can include the area around your pin when you zoom in. Photos are used only when you run a scan, to identify the landmark. Neither is collected in the background.',
        },
        {
          heading: 'Where it is stored',
          body: 'Accounts are hosted by Supabase; app data is served by our API; the site is hosted on Vercel. Your preferences, bookmarks and offline stories are stored in your browser\'s local storage and are removed when you clear site data or use "Clear offline cache" in settings.',
        },
        {
          heading: 'AI processing',
          body: 'Scanned images and chat messages are sent to our API, which forwards them to its AI provider to answer you. They are not used to identify you.',
        },
        {
          heading: 'Sharing',
          body: 'We do not sell your data. We only share what is necessary to run the service with our hosting, authentication, AI, and map providers.',
        },
        {
          heading: 'Your choices',
          body: 'You can edit your profile at any time and delete your account from the Profile screen. For any request about your data, open an issue in the {repo}.',
        },
      ] as Section[],
    },
  },
  {
    backToSignUp: 'Balik sa pag-sign up',
    repository: 'repository sa proyekto',
    referenceNote: 'Hubad kini aron mas sayon basahon. Kung adunay kalainan, ang English nga bersyon ang sundon.',
    terms: {
      title: 'Mga Termino sa Paggamit',
      sections: [
        {
          heading: 'Pagdawat',
          body: 'Pinaagi sa paghimo og account o paggamit sa Laag ta bAI, miuyon ka niini nga mga termino. Kung dili ka mouyon, ayaw gamita ang app.',
        },
        {
          heading: 'Imong account ug kwalipikasyon',
          body: 'Kinahanglan 18 anyos pataas ka aron makarehistro ug makahimo og account. Ikaw ang responsable sa impormasyon nga imong gihatag sa pag-sign up ug sa pagbantay sa imong mga credential. Sultihi kami kung nagtuo ka nga adunay laing tawo nga nakasulod sa imong account.',
        },
        {
          heading: 'Hustong paggamit',
          body: 'Gamita ang app para sa personal nga paglaag ug pagkat-on. Ayaw sulayi nga gubaon ang serbisyo, sayop nga gamiton ang AI nga giya, o magpadala og sulod nga wala kay katungod nga ipaambit.',
        },
        {
          heading: 'Sulod nga gihimo sa AI',
          body: 'Ang mga istorya sa landmark ug mga tubag sa AI gihimo sa AI ug mahimong kulang o sayop. Susiha ang importanteng mga detalye (oras sa pag-abli, bayad, kaluwasan) sa opisyal nga mga tinubdan sa dili pa ka molaag.',
        },
        {
          heading: 'Proyekto sa edukasyon',
          body: 'Ang Laag ta bAI usa ka proyekto sa mga estudyante nga gihatag "as is", walay garantiya. Sumala sa gitugot sa balaod, ang team dili manubag sa mga desisyon nga gihimo gamit ang app.',
        },
        { heading: 'Mga pangutana', body: 'Pag-abli og issue sa {repo} ug motubag kami.' },
      ],
    },
    privacy: {
      title: 'Palisiya sa Privacy',
      sections: [
        {
          heading: 'Unsa ang among kolektahon',
          body: 'Mga detalye sa account nga imong gisulat sa pag-sign up (ngalan, email, nasyonalidad ug opsyonal nga bio), imong pag-uswag sama sa XP, streak ug nahuman nga mga quest, ug ang mga landmark nga imong gi-save para basahon offline.',
        },
        {
          heading: 'Kinahanglanon sa edad ug petsa sa pagkatawo',
          body: 'Kinahanglan 18 anyos pataas ka aron makarehistro. Subay sa prinsipyo sa proporsyonalidad sa Data Privacy Act, ang petsa sa pagkatawo gikuha lang aron masusi nga 18 anyos pataas ka ug dili kini tipigan o ipadala sa among mga server.',
        },
        {
          heading: 'Lokasyon ug camera',
          body: 'Gamiton namo ang imong lokasyon aron ipakita kung asa ka sa mapa sa Suroy, mahan-ay ang mga duol nga landmark, ug masusi ang mga scan. Ang mapa magbutang sa eksaktong pin sa imong lokasyon sulod sa imong browser. Madawat sa Google Maps ang bahin sa mapa nga imong gitan-aw, lakip ang palibot sa imong pin kung mo-zoom in ka. Ang mga litrato gamiton lang kung mo-scan ka, aron mailhan ang landmark. Walay usa niini nga kolektahon sa background.',
        },
        {
          heading: 'Asa kini gitipigan',
          body: 'Ang mga account gi-host sa Supabase; ang datos sa app gihatag sa among API; ang site gi-host sa Vercel. Ang imong mga preference, bookmark ug offline nga mga istorya gitipigan sa local storage sa imong browser ug mawala kung imong hawanan ang datos sa site o gamiton ang "Hawani ang offline cache" sa settings.',
        },
        {
          heading: 'Pagproseso sa AI',
          body: 'Ang na-scan nga mga litrato ug mga mensahe sa chat ipadala sa among API, nga mopasa niini sa iyang AI provider aron matubag ka. Dili kini gamiton aron mailhan ka.',
        },
        {
          heading: 'Pagpaambit',
          body: 'Dili namo ibaligya ang imong datos. Ipaambit lang namo ang gikinahanglan aron modagan ang serbisyo sa among mga provider sa hosting, authentication, AI, ug mapa.',
        },
        {
          heading: 'Imong mga pilianan',
          body: 'Mahimo nimong usbon ang imong profile bisan kanus-a ug papason ang imong account sa Profile nga screen. Para sa bisan unsang hangyo bahin sa imong datos, pag-abli og issue sa {repo}.',
        },
      ],
    },
  },
)
